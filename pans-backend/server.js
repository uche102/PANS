import express from "express";
import pkg from "pg";
import jwt from "jsonwebtoken";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const { Pool } = pkg;
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8000;

// DATABASE
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      user: process.env.DB_USER || "postgres",
      host: process.env.DB_HOST || "localhost",
      database: process.env.DB_NAME || "pans_election",
      password: process.env.DB_PASSWORD || "password",
      port: process.env.DB_PORT || 5432,
    });

// MIDDLEWARE
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5000",
      "http://localhost:5174",
      process.env.VOTER_FRONTEND_URL,
      process.env.ADMIN_FRONTEND_URL,
    ].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true,
  }),
);

app.use(express.json());

// ADMIN CONFIG
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "FallbackPass";
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";

const requireAdmin = (req, res, next) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Admin token required" });
  }

  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Admin access denied" });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired admin token" });
  }
};

// TEMP OTP STORE
const otpStore = new Map();

// HEALTH CHECK
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Backend is running" });
});

// SEND OTP
app.post("/api/send-otp", async (req, res) => {
  const { regNo } = req.body;

  if (!regNo) {
    return res.status(400).json({ error: "Registration number is required" });
  }

  try {
    const student = await pool.query(
      "SELECT phone_number, name FROM voters WHERE reg_no = $1 AND voted = false",
      [regNo],
    );

    if (student.rows.length === 0) {
      return res.status(404).json({
        error: "Voter not found or already voted.",
      });
    }

    const { phone_number: phoneNumber, name } = student.rows[0];
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore.set(phoneNumber, {
      code: otp,
      expires: Date.now() + 5 * 60 * 1000,
    });

    const message = `Your PANS Election verification code is ${otp}. It expires in 5 minutes.`;

    // ensure correct format (+234...)
    const formattedNumber = phoneNumber.startsWith("0")
      ? `+234${phoneNumber.slice(1)}`
      : phoneNumber.startsWith("234")
        ? `+${phoneNumber}`
        : phoneNumber;

    await axios.post(
      "https://api.africastalking.com/version1/messaging",
      new URLSearchParams({
        username: process.env.AT_USERNAME,
        to: formattedNumber,
        message,
      }),
      {
        headers: {
          apiKey: process.env.AT_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
      },
    );

    const maskedPhone = formattedNumber.replace(
      /(\d{4})(\d+)(\d{2})/,
      "$1******$3",
    );

    res.json({
      success: true,
      message: "OTP sent successfully",
      sentTo: maskedPhone,
    });
  } catch (err) {
    console.error("OTP Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// VERIFY OTP
app.post("/api/verify-otp", async (req, res) => {
  const { regNo, userCode } = req.body;

  if (!regNo || !userCode) {
    return res.status(400).json({
      error: "Registration number and OTP are required",
    });
  }

  try {
    const student = await pool.query(
      "SELECT phone_number FROM voters WHERE reg_no = $1",
      [regNo],
    );

    if (student.rows.length === 0) {
      return res.status(404).json({ error: "Voter not found" });
    }

    const phoneNumber = student.rows[0].phone_number;
    const record = otpStore.get(phoneNumber);

    if (!record) {
      return res.status(400).json({ error: "OTP not found or expired" });
    }

    if (Date.now() > record.expires) {
      otpStore.delete(phoneNumber);
      return res.status(400).json({ error: "OTP expired" });
    }

    if (record.code !== userCode) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    otpStore.delete(phoneNumber);

    res.json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ error: "Verification error" });
  }
});

// SUBMIT VOTE
app.post("/api/vote", async (req, res) => {
  const { regNo, candidateIds } = req.body;

  if (!regNo || !Array.isArray(candidateIds) || candidateIds.length === 0) {
    return res.status(400).json({ error: "Invalid vote payload" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const voterResult = await client.query(
      "SELECT id, voted FROM voters WHERE reg_no = $1 FOR UPDATE",
      [regNo],
    );

    if (voterResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Voter not found" });
    }

    const voter = voterResult.rows[0];

    if (voter.voted) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Voter has already voted" });
    }

    for (const candidateId of candidateIds) {
      await client.query(
        "INSERT INTO votes (voter_id, candidate_id) VALUES ($1, $2)",
        [voter.id, candidateId],
      );
    }

    await client.query("UPDATE voters SET voted = true WHERE id = $1", [
      voter.id,
    ]);

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Vote submitted successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Vote submission error:", err);
    res.status(500).json({ error: "Failed to submit vote" });
  } finally {
    client.release();
  }
});

// ADMIN LOGIN
app.post("/api/admin-login", (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ role: "admin", username }, JWT_SECRET, {
      expiresIn: "6h",
    });

    return res.json({
      success: true,
      token,
      message: "Admin login successful",
    });
  }

  return res.status(401).json({ error: "Invalid admin credentials" });
});

// RESULTS
app.get("/api/results", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.office,
        c.name,
        COUNT(v.id)::int AS value
      FROM candidates c
      LEFT JOIN votes v ON v.candidate_id = c.id
      GROUP BY c.id, c.office, c.name
      ORDER BY c.office, c.name
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Results fetch error:", err);
    res.status(500).json({ error: "Failed to load results" });
  }
});

// VOTERS
app.get("/api/voters", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        reg_no AS reg,
        name,
        phone_number,
        CASE 
          WHEN voted = true THEN 'Voted'
          ELSE 'Not Voted'
        END AS status
      FROM voters
      ORDER BY reg_no
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Voters fetch error:", err);
    res.status(500).json({ error: "Failed to load voters" });
  }
});

// FRONTEND SERVING - ONLY USED AFTER BUILD
app.use("/admin", express.static(path.join(__dirname, "dist-admin")));
app.use(express.static(path.join(__dirname, "dist-voter")));

app.get(/^\/admin(?:\/.*)?$/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist-admin", "index.html"));
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist-voter", "index.html"));
});

// START SERVER
const server = app.listen(PORT, () => {
  console.log(`Election backend running on port ${PORT}`);
});

server.on("error", (err) => {
  console.error("SERVER ERROR:", err);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});
