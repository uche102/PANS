import nodemailer from "nodemailer";

const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];
const missing = required.filter((name) => !process.env[name]);

if (missing.length) {
  console.error(`Missing SMTP environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const to = process.argv[2] || process.env.SMTP_TEST_TO || process.env.SMTP_USER;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: String(process.env.SMTP_PORT) === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

await transporter.verify();

const info = await transporter.sendMail({
  from: process.env.SMTP_FROM,
  to,
  subject: "PANS UniZik SMTP test",
  text: "SMTP is configured correctly for the PANS UniZik election site.",
});

console.log(`SMTP verified. Test email sent to ${to}. Message id: ${info.messageId}`);
