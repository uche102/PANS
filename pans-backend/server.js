import express from "express";
import { Pool } from "pg";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5000"],
    methods: ["GET", "POST"],
    credentials: true,
  }),
);
app.use(express.json());

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "pans_election",
  password: process.env.DB_PASSWORD || "password",
  port: 5432,
});

// --- SECURITY SETTINGS ---
const ADMIN_PASS = process.env.ADMIN_PASSWORD || "FallbackPass";


const protectAdmin = (req, res, next) => {
  // RIGHT: Read the header sent by the browser
  const auth = req.headers.authorization;
  if (!auth) {
    res.set("WWW-Authenticate", 'Basic realm="401"');
    return res.status(401).send("Authentication required");
  }

  const b64auth = auth.split(" ")[1] || "";
  const [login, password] = Buffer.from(b64auth, "base64")
    .toString()
    .split(":");

  if (login === ADMIN_USER && password === ADMIN_PASS) {
    return next();
  }

  res.status(401).send("Invalid Credentials");
};

// --- API ROUTES ---

// Public Login Route (Used by AdminLogin.jsx)
app.post("/api/admin-login", (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASS) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: "Invalid Key" });
  }
});

// Protected Data Routes
app.get("/api/results", protectAdmin, async (req, res) => {
  try {
    const results = await pool.query(
      "SELECT office, name, votes as value FROM candidates ORDER BY office, id",
    );
    res.json(results.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/voters", protectAdmin, async (req, res) => {
  try {
    const list = await pool.query(
      "SELECT reg_no as reg, TO_CHAR(vote_time, 'HH:MI AM') as time FROM voters ORDER BY vote_time DESC",
    );
    res.json(list.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public Vote Route
app.post("/api/vote", async (req, res) => {});
// Temporary store for OTPs (In production, use a DB table)
const otpStore = new Map();

app.post("/api/send-otp", async (req, res) => {
  const { regNo } = req.body;
  try {
    // 1. UPDATED: Query 'voters' table and check 'voted' column
    const student = await pool.query(
      "SELECT phone_number, name FROM voters WHERE reg_no = $1 AND voted = false",
      [regNo],
    );

    if (student.rows.length === 0) {
      // Professional tip: Check if they exist but already voted to give a better error
      return res
        .status(404)
        .json({ error: "Voter not found or already voted." });
    }

    const { phone_number: phoneNumber, name } = student.rows[0];
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Save OTP locally for verification
    otpStore.set(phoneNumber, {
      code: otp,
      expires: Date.now() + 5 * 60 * 1000,
    });

    // 3. Send via BulkSMSNigeria
    const response = await axios.post(
      "https://www.bulksmsnigeria.com/api/v2/sms",
      {
        from: process.env.BULKSMS_SENDER_ID || "PANSUNIZIK",
        to: phoneNumber,
        body: `Hello ${name}, your PANS election OTP is ${otp}. Valid for 5 mins.`,
        gateway: "direct-corporate",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.BULKSMS_TOKEN}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
    );

    // 4. Mask the phone for security in the UI
    const maskedPhone = phoneNumber.replace(
      /(\d{3})(\d{5})(\d{2})/,
      "$1******$3",
    );

    res.json({ success: true, sentTo: maskedPhone });
  } catch (err) {
    // Log the actual gateway error for debugging
    console.error("BulkSMS Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to dispatch SMS OTP" });
  }
});

// 3. Verification Route
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

// --- SERVING FRONTEND ---

// Protected Admin Folder (Stops students from downloading the UI)
app.use(
  "/admin",
  protectAdmin, // This ensures the browser asks for a password immediately
  express.static(path.join(__dirname, "dist-admin")),
);

// Public Voter Portal
app.use(express.static(path.join(__dirname, "dist-voter")));
app.get("/admin/*", protectAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "dist-admin", "index.html"));
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist-voter", "index.html"));
});

// SPA Routing

const PORT = 8000;
app.listen(PORT, () => console.log(`Election System live on port ${PORT}`));
