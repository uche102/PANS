import express from "express";
import pkg from "pg";
const { Pool } = pkg;
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
console.log("ADMIN USER =", process.env.ADMIN_USER);
console.log("ADMIN PASS =", process.env.ADMIN_PASS);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- DATABASE CONFIGURATION ---
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "pans_election",
  password: process.env.DB_PASSWORD || "password",
  port: process.env.DB_PORT || 5432,
});

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5000"],
    methods: ["GET", "POST"],
    credentials: true,
  }),
);
app.use(express.json());

// --- SECURITY SETTINGS ---
const ADMIN_USER = process.env.ADMIN_USER || "admin"; // FIXED: Added missing variable
const ADMIN_PASS = process.env.ADMIN_PASS || "FallbackPass";
let adminLoggedIn = false;
const requireAdmin = (req, res, next) => {
  if (!adminLoggedIn) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  next();
};

const protectAdmin = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) {
    res.set("WWW-Authenticate", 'Basic realm="401"');
    return res.status(401).send("Authentication required");
  }

  const b64auth = auth.split(" ")[1] || "";
  const [login, password] = Buffer.from(b64auth, "base64")
    .toString()
    .split(":");

  // FIXED: Now uses the defined ADMIN_USER
  if (login === ADMIN_USER && password === ADMIN_PASS) {
    return next();
  }
  res.status(401).send("Invalid Credentials");
};

// --- API ROUTES ---

const otpStore = new Map();

// Send OTP via BulkSMSNigeria
app.post("/api/send-otp", async (req, res) => {
  const { regNo } = req.body;

  try {
    const student = await pool.query(
      "SELECT phone_number, name FROM voters WHERE reg_no = $1 AND voted = false",
      [regNo],
    );

    if (student.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Voter not found or already voted." });
    }

    const { phone_number: phoneNumber, name } = student.rows[0];
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore.set(phoneNumber, {
      code: otp,
      expires: Date.now() + 5 * 60 * 1000,
    });

    console.log(`TEST OTP for ${name} (${regNo}): ${otp}`);

    const maskedPhone = phoneNumber.replace(
      /(\d{3})(\d{5})(\d{2})/,
      "$1******$3",
    );

    res.json({
      success: false,
      sentTo: maskedPhone,
      testMode: true,
    });
  } catch (err) {
    console.error("OTP Error:", err);
    res.status(500).json({ error: "Failed to generate OTP" });
  }
});

// Verification Route
app.post("/api/verify-otp", async (req, res) => {
  const { regNo, userCode } = req.body;
  try {
    const student = await pool.query(
      "SELECT phone_number FROM voters WHERE reg_no = $1",
      [regNo],
    );
    if (student.rows.length === 0)
      return res.status(404).json({ message: "Student not found" });

    const phoneNumber = student.rows[0].phone_number;
    const record = otpStore.get(phoneNumber);

    if (!record || record.code !== userCode || Date.now() > record.expires) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    otpStore.delete(phoneNumber);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Verification error" });
  }
});
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
    res.json({ success: true, message: "Vote submitted successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Vote submission error:", err);
    res.status(500).json({ error: "Failed to submit vote" });
  } finally {
    client.release();
  }
});
app.post("/api/admin-login", (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    adminLoggedIn = true;
    return res.json({ success: true });
  }

  return res.status(401).json({ error: "Invalid admin credentials" });
});

// Serving UI
// app.use(
//   "/admin",
//   protectAdmin,
//   express.static(path.join(__dirname, "dist-admin")),
// );
// Serve built files
app.use("/admin", express.static(path.join(__dirname, "dist-admin")));
app.use(express.static(path.join(__dirname, "dist-voter")));

// Admin SPA
app.get(/^\/admin(?:\/.*)?$/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist-admin", "index.html"));
});

// Voter SPA
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist-voter", "index.html"));
});

app.get("/api/results", async (req, res) => {
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

app.get("/api/voters", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        reg_no AS reg,
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
const PORT = process.env.PORT || 8000;

const server = app.listen(PORT, () => {
  console.log(`Election System live on port ${PORT}`);
});

server.on("error", (err) => {
  console.error("SERVER ERROR:", err);
});

process.on("exit", (code) => {
  console.log("PROCESS EXITED WITH CODE:", code);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});
