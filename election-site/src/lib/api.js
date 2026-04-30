async function request(path, options = {}) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
  const voterToken = sessionStorage.getItem("pansVoterToken");
  const adminToken = sessionStorage.getItem("pansAdminToken");
  const authorization = options.authorization || voterToken || adminToken || "";
  const response = await fetch(`${baseUrl}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || "Request failed.");
  }
  return data;
}

export const api = {
  requestOtp: (regNo) => request("/api/request-otp", { method: "POST", body: { reg_no: regNo } }),
  verifyOtp: (regNo, otp) => request("/api/verify-otp", { method: "POST", body: { reg_no: regNo, otp } }),
  me: () => request("/api/me"),
  election: () => request("/api/election"),
  vote: (selections) => request("/api/vote", { method: "POST", body: { selections } }),
  adminLogin: (password) => request("/api/admin/login", { method: "POST", body: { password } }),
  adminSession: () => request("/api/admin/session"),
  adminPosts: () => request("/api/admin/posts"),
  savePost: (post) =>
    request("/api/admin/posts", { method: post.id ? "PUT" : "POST", body: post }),
  deletePost: (id) => request("/api/admin/posts", { method: "DELETE", body: { id } }),
  adminCandidates: () => request("/api/admin/candidates"),
  saveCandidate: (candidate) =>
    request("/api/admin/candidates", {
      method: candidate.id ? "PUT" : "POST",
      body: candidate,
    }),
  deleteCandidate: (id) =>
    request("/api/admin/candidates", { method: "DELETE", body: { id } }),
  votersVoted: () => request("/api/admin/voters-voted"),
  results: () => request("/api/admin/results"),
};
