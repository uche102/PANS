import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { getSingle, insertRows, supabaseRequest } from "./supabase.js";

const OTP_EXPIRES_AT = "9999-12-31T23:59:59.000Z";

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
  const existing = await getSingle("otp_codes", {
    reg_no: `eq.${regNo}`,
    order: "created_at.desc",
  });
  if (existing) {
    throw new Error("An OTP has already been sent to this registration number.");
  }

  const [record] = await insertRows("otp_codes", [
    {
      reg_no: regNo,
      code_hash: hashOtp(code),
      expires_at: OTP_EXPIRES_AT,
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
  if (process.env.RESEND_API_KEY && process.env.EMAIL_PROVIDER !== "brevo") {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "PANS UniZik Election <onboarding@resend.dev>",
        to: [voter.email],
        subject: "PANS UniZik Election OTP",
        text: `Your PANS UniZik election login OTP is ${code}. Keep this code safe. It remains valid until you use it to log in and vote.`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.5">
            <h2>PANS UniZik Election Login</h2>
            <p>Hello ${voter.name || voter.reg_no},</p>
            <p>Your login OTP is:</p>
            <p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p>
            <p>Keep this code safe. It remains valid until you use it to log in and vote.</p>
          </div>
        `,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || "Resend email request failed.");
    }

    console.log("OTP email accepted by Resend", {
      to: voter.email,
      id: data.id,
    });

    return {
      messageId: data.id,
      accepted: [voter.email],
      rejected: [],
      response: "Accepted by Resend",
    };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_PORT) === "465",
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: voter.email,
    subject: "PANS UniZik Election OTP",
    text: `Your PANS UniZik election login OTP is ${code}. Keep this code safe. It remains valid until you use it to log in and vote.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>PANS UniZik Election Login</h2>
        <p>Hello ${voter.name || voter.reg_no},</p>
        <p>Your login OTP is:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p>
        <p>Keep this code safe. It remains valid until you use it to log in and vote.</p>
      </div>
    `,
  });

  console.log("OTP email accepted by SMTP provider", {
    to: voter.email,
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
  });

  return info;
}

export function maskEmail(email) {
  const [user, domain] = String(email || "").split("@");
  if (!user || !domain) return "your registered email";
  return `${user.slice(0, 2)}***@${domain}`;
}
