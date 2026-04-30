import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { getSingle, insertRows, supabaseRequest } from "./supabase.js";

const OTP_TTL_MINUTES = 10;

function hashOtp(code) {
  return crypto
    .createHash("sha256")
    .update(`${code}:${process.env.OTP_PEPPER || "pans-unizik"}`)
    .digest("hex");
}

export function createOtpCode() {
  return String(crypto.randomInt(100000, 999999));
}

export async function storeOtp(regNo, code) {
  await supabaseRequest("otp_codes", {
    method: "PATCH",
    query: { reg_no: `eq.${regNo}`, used_at: "is.null" },
    body: { used_at: new Date().toISOString() },
  });

  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  const [record] = await insertRows("otp_codes", [
    {
      reg_no: regNo,
      code_hash: hashOtp(code),
      expires_at: expiresAt.toISOString(),
    },
  ]);
  return record;
}

export async function verifyOtp(regNo, code) {
  const otp = await getSingle("otp_codes", {
    reg_no: `eq.${regNo}`,
    used_at: "is.null",
    order: "created_at.desc",
  });

  if (!otp) return { ok: false, message: "No active OTP found." };
  if (otp.attempts >= 5) return { ok: false, message: "Too many OTP attempts." };
  if (new Date(otp.expires_at).getTime() < Date.now()) {
    return { ok: false, message: "OTP has expired." };
  }

  const isMatch = hashOtp(code) === otp.code_hash;
  if (!isMatch) {
    await supabaseRequest("otp_codes", {
      method: "PATCH",
      query: { id: `eq.${otp.id}` },
      body: { attempts: otp.attempts + 1 },
    });
    return { ok: false, message: "Invalid OTP." };
  }

  await supabaseRequest("otp_codes", {
    method: "PATCH",
    query: { id: `eq.${otp.id}` },
    body: { used_at: new Date().toISOString() },
  });

  return { ok: true };
}

export async function sendOtpEmail(voter, code) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_PORT) === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: voter.email,
    subject: "PANS UniZik Election OTP",
    text: `Your PANS UniZik election login OTP is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>PANS UniZik Election Login</h2>
        <p>Hello ${voter.name || voter.reg_no},</p>
        <p>Your login OTP is:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p>
        <p>This code expires in ${OTP_TTL_MINUTES} minutes.</p>
      </div>
    `,
  });
}

export function maskEmail(email) {
  const [user, domain] = String(email || "").split("@");
  if (!user || !domain) return "your registered email";
  return `${user.slice(0, 2)}***@${domain}`;
}
