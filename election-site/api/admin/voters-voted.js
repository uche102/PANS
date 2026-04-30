import { json, methodNotAllowed } from "../_lib/http.js";
import { requireAdmin } from "../_lib/session.js";
import { supabaseRequest } from "../_lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);
  const admin = requireAdmin(req, res);
  if (!admin) return;

  try {
    const voters = await supabaseRequest("voters_with_vote_status", {
      query: { select: "*", has_voted: "eq.true", order: "name.asc" },
    });
    return json(res, 200, { voters });
  } catch (error) {
    return json(res, 500, { error: error.message || "Could not load voters." });
  }
}
