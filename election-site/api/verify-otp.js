import { json, methodNotAllowed, readBody } from "./_lib/http.js";
import { verifyOtp } from "./_lib/otp.js";
import { createVoterSession } from "./_lib/session.js";
import { getSingle } from "./_lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    const { reg_no, regNo, otp } = await readBody(req);
    const regNoValue = String(reg_no || regNo || "").trim().toUpperCase();
    const otpValue = String(otp || "").trim();

    if (!regNoValue || !otpValue) {
      return json(res, 400, { error: "Registration number and OTP are required." });
    }

    const result = await verifyOtp(regNoValue, otpValue);
    if (!result.ok) return json(res, 400, { error: result.message });

    const voter = await getSingle("voters", { reg_no: `eq.${regNoValue}` });
    if (!voter) return json(res, 404, { error: "Voter not found." });

    const token = createVoterSession(res, voter);
    return json(res, 200, {
      voter: {
        reg_no: voter.reg_no,
        name: voter.name,
        level: voter.level,
      },
      token,
    });
  } catch (error) {
    return json(res, 500, { error: error.message || "OTP verification failed." });
  }
}
