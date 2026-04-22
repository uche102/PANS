import express from "express";
import pkg from "pg";
const { Pool } = pkg;
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

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

    await axios.post(
      "https://api.ng.termii.com/api/sms/send",
      {
        to: phoneNumber,
        from: process.env.TERMII_SENDER_ID,
        sms: `Hello ${name}, your PANS election OTP is ${otp}. Valid for 5 mins.`,
        type: "plain",
        channel: "generic",
        api_key: process.env.TERMII_API_KEY,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const maskedPhone = phoneNumber.replace(
      /(\d{3})(\d{5})(\d{2})/,
      "$1******$3",
    );
    res.json({ success: true, sentTo: maskedPhone });
  } catch (err) {
  const details = err.response?.data || err.message;
  console.error("Termii Error:", details);
  res.status(500).json({
    error: "Failed to dispatch SMS OTP",
    details,
  });
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

// Serving UI
app.use(
  "/admin",
  protectAdmin,
  express.static(path.join(__dirname, "dist-admin")),
);
app.use(express.static(path.join(__dirname, "dist-voter")));

// This tells Express: "Match anything that starts with /admin/ and capture the rest"
app.get(/^\/admin\/.*$/, protectAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "dist-admin", "index.html"));
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist-voter", "index.html"));
});
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Election System live on port ${PORT}`));
