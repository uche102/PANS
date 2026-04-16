import express from "express";
import { Pool } from "pg";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

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
  password: "password",
  port: 5432,
});
const TERMII_API_KEY = "YOUR_TERMII_KEY";
const TERMII_SENDER_ID = "PANS_UNIZIK";

app.post("/api/request-otp", async (req, res) => {
  const { regNo } = req.body;

  try {
   
    const student = await pool.query(
      "SELECT phone_number FROM students WHERE reg_no = $1 AND has_voted = false",
      [regNo],
    );

    if (student.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Voter not found or already voted." });
    }

    const phoneNumber = student.rows[0].phone_number;
    const otp = Math.floor(100000 + Math.random() * 700000); // 6-digit OTP

    
    const response = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: phoneNumber,
        from: TERMII_SENDER_ID,
        sms: `Your PANS UNIZIK Election OTP is: ${otp}. Do not share this with anyone.`,
        type: "plain",
        channel: "dnd", // Use DND channel for Nigerian numbers
        api_key: TERMII_API_KEY,
      }),
    });

    

    res.json({ success: true, message: "OTP sent successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to process request." });
  }
});

// --- SECURITY SETTINGS ---
const ADMIN_USER = "pans_admin";
const ADMIN_PASS = "PANS2026";

const protectAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const b64auth = authHeader.split(" ")[1] || "";
  const [login, password] = Buffer.from(b64auth, "base64")
    .toString()
    .split(":");

  if (login === ADMIN_USER && password === ADMIN_PASS) {
    return next();
  }
  res.set("WWW-Authenticate", 'Basic realm="401"');
  res.status(401).send("Authentication required");
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

// --- SERVING THE FRONTEND ---

// Protected Admin Folder (Stops students from downloading the UI)
app.use(
  "/admin",
  protectAdmin,
  express.static(path.join(__dirname, "dist-admin")),
);

// Public Voter Portal
app.use(express.static(path.join(__dirname, "dist-voter")));

// SPA Routing
app.get(/\/admin\/.*/, protectAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "dist-admin", "index.html"));
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist-voter", "index.html"));
});

const PORT = 8000;
app.listen(PORT, () => console.log(`Election System live on port ${PORT}`));
