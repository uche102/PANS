import { json, methodNotAllowed, readBody } from "../_lib/http.js";
import { requireAdmin } from "../_lib/session.js";
import { insertRows, supabaseRequest } from "../_lib/supabase.js";

export default async function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  try {
    if (req.method === "GET") {
      const posts = await supabaseRequest("posts", {
        query: { select: "*", title: "not.like.__PANS_ELECTION_CONTROL__:%", order: "display_order.asc" },
      });
      return json(res, 200, { posts });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      if (!body.title) return json(res, 400, { error: "Post title is required." });
      const [post] = await insertRows("posts", [
        {
          title: body.title.trim(),
          display_order: Number(body.display_order || 0),
          is_active: body.is_active !== false,
        },
      ]);
      return json(res, 201, { post });
    }

    if (req.method === "PUT") {
      const body = await readBody(req);
      if (!body.id || !body.title) return json(res, 400, { error: "Post id and title are required." });
      const post = await supabaseRequest("posts", {
        method: "PATCH",
        query: { id: `eq.${body.id}` },
        body: {
          title: body.title.trim(),
          display_order: Number(body.display_order || 0),
          is_active: body.is_active !== false,
        },
      });
      return json(res, 200, { post: post[0] });
    }

    if (req.method === "DELETE") {
      const { id } = await readBody(req);
      if (!id) return json(res, 400, { error: "Post id is required." });
      await supabaseRequest("posts", { method: "DELETE", query: { id: `eq.${id}` } });
      return json(res, 200, { message: "Post deleted." });
    }

    return methodNotAllowed(res);
  } catch (error) {
    return json(res, 500, { error: error.message || "Post request failed." });
  }
}
