import { json, methodNotAllowed } from "../_lib/http.js";
import { requireAdmin } from "../_lib/session.js";
import { supabaseRequest } from "../_lib/supabase.js";

export default async function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    const votes = await supabaseRequest("votes", { query: { select: "id" } });
    const candidates = await supabaseRequest("candidates", { query: { select: "id" } });
    const posts = await supabaseRequest("posts", { query: { select: "id" } });

    if (votes.length) {
      await supabaseRequest("votes", {
        method: "DELETE",
        query: { id: `in.(${votes.map((row) => row.id).join(",")})` },
      });
    }
    if (candidates.length) {
      await supabaseRequest("candidates", {
        method: "DELETE",
        query: { id: `in.(${candidates.map((row) => row.id).join(",")})` },
      });
    }
    if (posts.length) {
      await supabaseRequest("posts", {
        method: "DELETE",
        query: { id: `in.(${posts.map((row) => row.id).join(",")})` },
      });
    }

    return json(res, 200, {
      message: "Election setup has been reset. Add new posts and candidates now.",
    });
  } catch (error) {
    return json(res, 500, { error: error.message || "Could not reset election setup." });
  }
}
