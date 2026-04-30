import { json, methodNotAllowed } from "../_lib/http.js";
import { requireAdmin } from "../_lib/session.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);
  const admin = requireAdmin(req, res);
  if (!admin) return;
  return json(res, 200, { admin: true });
}
