import { json, methodNotAllowed, readBody } from "./_lib/http.js";
import { createOtpCode, maskEmail, sendOtpEmail, storeOtp } from "./_lib/otp.js";
import { getSingle } from "./_lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    const { reg_no, regNo } = await readBody(req);
    const regNoValue = String(reg_no || regNo || "").trim().toUpperCase();
    if (!regNoValue) return json(res, 400, { error: "Registration number is required." });

    const voter = await getSingle("voters", { reg_no: `eq.${regNoValue}` });
    if (!voter) return json(res, 404, { error: "Registration number was not found." });
    if (!voter.email) return json(res, 400, { error: "No email is attached to this voter." });

    const code = createOtpCode();
    await storeOtp(voter.reg_no, code);

    if (process.env.ALLOW_DEV_OTP === "true" && process.env.NODE_ENV !== "production") {
      return json(res, 200, {
        message: "OTP generated in local test mode.",
        sentTo: maskEmail(voter.email),
        testMode: true,
        devOtp: code,
      });
    }

    await sendOtpEmail(voter, code);

    return json(res, 200, {
      message: "OTP sent.",
      sentTo: maskEmail(voter.email),
    });
  } catch (error) {
    return json(res, 500, { error: error.message || "Could not send OTP." });
  }
}
