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
  await supabaseRequest("otp_codes", {
    method: "PATCH",
    query: {
      reg_no: `eq.${regNo}`,
      used_at: "is.null",
    },
    body: { used_at: new Date().toISOString() },
  });

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
  const subject = "PANS UniZik Election OTP";
  const text = `Your PANS UniZik election login OTP is ${code}. Keep this code safe. It remains valid until you use it to log in and vote.`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <h2>PANS UniZik Election Login</h2>
      <p>Hello ${voter.name || voter.reg_no},</p>
      <p>Your login OTP is:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p>
      <p>Keep this code safe. It remains valid until you use it to log in and vote.</p>
    </div>
  `;

  if (process.env.BREVO_API_KEY) {
    const sender = parseSender(
      process.env.BREVO_FROM ||
        process.env.SMTP_FROM ||
        "PANS UniZik Election <noreply@example.com>",
    );

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender,
        to: [{ email: voter.email, name: voter.name || voter.reg_no }],
        subject,
        textContent: text,
        htmlContent: html,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || "Brevo email request failed.");
    }

    console.log("OTP email accepted by Brevo API", {
      to: voter.email,
      id: data.messageId,
    });

    return {
      messageId: data.messageId,
      accepted: [voter.email],
      rejected: [],
      response: "Accepted by Brevo API",
    };
  }

  const smtpConfig = {
    host: normalizeSmtpHost(process.env.SMTP_HOST || process.env.BREVO_SMTP_HOST),
    port: process.env.SMTP_PORT || process.env.BREVO_SMTP_PORT || 587,
    user: process.env.SMTP_USER || process.env.BREVO_SMTP_USER,
    pass: process.env.SMTP_PASS || process.env.BREVO_SMTP_PASS,
    from: process.env.SMTP_FROM || process.env.BREVO_FROM,
  };
  const missing = Object.entries(smtpConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length) {
    throw new Error(
      `Missing email configuration: ${missing.join(", ")}. Set BREVO_API_KEY + BREVO_FROM, or SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.`,
    );
  }

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: Number(smtpConfig.port),
    secure: String(smtpConfig.port) === "465",
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    },
  });

  const info = await transporter.sendMail({
    from: smtpConfig.from,
    to: voter.email,
    subject,
    text,
    html,
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

function normalizeSmtpHost(host) {
  const value = String(host || "").trim();
  if (value === "smtp.brevo.com") return "smtp-relay.brevo.com";
  return value;
}

function parseSender(value) {
  const sender = String(value || "").trim();
  const match = sender.match(/^(.*)<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].trim().replace(/^"|"$/g, "") || undefined,
      email: match[2].trim(),
    };
  }
  return {
    name: "PANS UniZik Election",
    email: sender,
  };
}

export function maskEmail(email) {
  const [user, domain] = String(email || "").split("@");
  if (!user || !domain) return "your registered email";
  return `${user.slice(0, 2)}***@${domain}`;
}
