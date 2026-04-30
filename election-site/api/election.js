import { json, methodNotAllowed } from "./_lib/http.js";
import { supabaseRequest } from "./_lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);

  try {
    const posts = await supabaseRequest("posts", {
      query: { select: "id,title,display_order,is_active", is_active: "eq.true", order: "display_order.asc" },
    });
    const candidates = await supabaseRequest("candidates", {
      query: { select: "id,post_id,name,tagline,image_url,display_order,is_active", is_active: "eq.true", order: "display_order.asc" },
    });

    return json(res, 200, {
      posts: posts.map((post) => ({
        ...post,
        candidates: candidates.filter((candidate) => candidate.post_id === post.id),
      })),
    });
  } catch (error) {
    return json(res, 500, { error: error.message || "Could not load election." });
  }
}
