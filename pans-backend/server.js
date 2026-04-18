import express from "express";
import { Pool } from "pg";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import dotenv from "dotenv";  
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const resend = new Resend(process.env.RESEND_API_KEY);

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
const ADMIN_USER = "pans_admin";
const ADMIN_PASS = "PANS2026";

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
app.post("/api/vote", async (req, res) => {
  // ... existing vote logic
});
// Temporary store for OTPs (In production, use a DB table)
const otpStore = new Map();

app.post("/api/send-otp", async (req, res) => {
  const { regNo } = req.body; // 1. Frontend only sends the Registration Number

  try {
    // 2. Query the DB to find the student and their official email
    const studentQuery = await pool.query(
      "SELECT email, name FROM students WHERE reg_no = $1 AND has_voted = false",
      [regNo],
    );

    if (studentQuery.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Student not found or has already voted." });
    }

    const { email, name } = studentQuery.rows[0];
    const otp = Math.floor(100000 + Math.random() * 900000);

    // 3. Store the OTP against the email in your Map (or DB)
    otpStore.set(email, {
      code: otp.toString(),
      expires: Date.now() + 5 * 60 * 1000,
    });

    // 4. Send to the email found in the database
    await resend.emails.send({
      from: "PANS Verification <onboarding@resend.dev>",
      to: email,
      subject: "Your Voting OTP",
      html: `<strong>Hello ${name}, your OTP is ${otp}</strong>. It expires in 5 minutes.`,
    });

    // 5. Tell the frontend it worked (but don't reveal the full email for privacy)
    const maskedEmail = email.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => {
      return gp2 + "*".repeat(gp3.length);
    });

    res.status(200).json({
      message: "OTP sent successfully",
      sentTo: maskedEmail, // e.g., "uw***@gmail.com"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to process OTP request" });
  }
});

// 3. Verification Route
app.post("/api/verify-otp", async (req, res) => {
  const { regNo, userCode } = req.body;

  try {
    // Look up the email associated with this Reg No
    const student = await pool.query(
      "SELECT email FROM students WHERE reg_no = $1",
      [regNo],
    );
    if (student.rows.length === 0)
      return res.status(404).json({ message: "Student not found" });

    const email = student.rows[0].email;
    const record = otpStore.get(email);

    if (!record || record.code !== userCode || Date.now() > record.expires) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    otpStore.delete(email);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Verification error" });
  }
});


// --- SERVING THE FRONTEND ---

// Protected Admin Folder (Stops students from downloading the UI)
app.use(
  "/admin",
  protectAdmin,
  express.static(path.join(__dirname, "dist-admin")),
);

// Public Voter Portal
app.use(express.static(path.join(__dirname, "dist-voter")));
app.get(/\/admin\/.*/, protectAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "dist-admin", "index.html"));
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist-voter", "index.html"));
});


// SPA Routing

const PORT = 8000;
app.listen(PORT, () => console.log(`Election System live on port ${PORT}`));
