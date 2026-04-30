import { json, methodNotAllowed, readBody } from "../_lib/http.js";
import { requireAdmin } from "../_lib/session.js";
import { supabaseRequest } from "../_lib/supabase.js";

export default async function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    const { items = [] } = await readBody(req);
    const votes = await supabaseRequest("votes", { query: { select: "id" } });
    const candidates = await supabaseRequest("candidates", { query: { select: "id" } });
    const posts = await supabaseRequest("posts", { query: { select: "id" } });

    if (votes.length) {
      await supabaseRequest("votes", { method: "DELETE", query: { id: `in.(${votes.map((row) => row.id).join(",")})` } });
    }
    if (candidates.length) {
      await supabaseRequest("candidates", { method: "DELETE", query: { id: `in.(${candidates.map((row) => row.id).join(",")})` } });
    }
    if (posts.length) {
      await supabaseRequest("posts", { method: "DELETE", query: { id: `in.(${posts.map((row) => row.id).join(",")})` } });
    }

    if (Array.isArray(items) && items.length) {
      const importedPosts = new Map();
      for (const item of items) {
        const title = String(item.post || item.title || "").trim();
        const name = String(item.name || "").trim();
        const tagline = String(item.tagline || "").trim();
        const image_url = String(item.image_url || item.image || "").trim();
        const display_order = Number(item.display_order || item.order || 0);

        if (!title || !name) continue;

        if (!importedPosts.has(title)) {
          const [post] = await supabaseRequest("posts", {
            method: "POST",
            body: {
              title,
              display_order: Number(item.post_order || item.group_order || importedPosts.size + 1),
              is_active: true,
            },
          });
          importedPosts.set(title, post.id);
        }

        await supabaseRequest("candidates", {
          method: "POST",
          body: {
            post_id: importedPosts.get(title),
            name,
            tagline,
            image_url,
            display_order,
            is_active: true,
          },
        });
      }
    }

    return json(res, 200, {
      message: "Election setup has been reset.",
    });
  } catch (error) {
    return json(res, 500, { error: error.message || "Could not reset election setup." });
  }
}
