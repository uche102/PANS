import { json, methodNotAllowed, readBody } from "./_lib/http.js";
import { getElectionStatus } from "./_lib/election-status.js";
import { requireVoter } from "./_lib/session.js";
import { insertRows, supabaseRequest } from "./_lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    const voter = requireVoter(req, res);
    if (!voter) return;

    const status = await getElectionStatus();
    if (!status.votingOpen) {
      return json(res, 403, { error: "Voting is currently closed." });
    }

    const existingVotes = await supabaseRequest("votes", {
      query: { reg_no: `eq.${voter.reg_no}`, select: "id", limit: "1" },
    });
    if (existingVotes.length > 0) {
      return json(res, 409, { error: "This voter has already submitted a ballot." });
    }

    const { selections } = await readBody(req);
    if (!selections || typeof selections !== "object") {
      return json(res, 400, { error: "Vote selections are required." });
    }

    const posts = await supabaseRequest("posts", {
      query: { select: "id", is_active: "eq.true" },
    });
    const requiredPostIds = posts.map((post) => String(post.id));
    const selectedPostIds = Object.keys(selections);

    if (
      requiredPostIds.length === 0 ||
      selectedPostIds.length !== requiredPostIds.length ||
      requiredPostIds.some((postId) => !selectedPostIds.includes(postId))
    ) {
      return json(res, 400, { error: "Please vote for every available post." });
    }

    const rows = Object.entries(selections).map(([postId, candidateId]) => ({
      reg_no: voter.reg_no,
      post_id: postId,
      candidate_id: candidateId,
    }));

    const candidateIds = Object.values(selections);
    const candidates = await supabaseRequest("candidates", {
      query: {
        select: "id,post_id,is_active",
        id: `in.(${candidateIds.join(",")})`,
        is_active: "eq.true",
      },
    });
    const validSelections = rows.every((row) =>
      candidates.some(
        (candidate) =>
          String(candidate.id) === String(row.candidate_id) &&
          String(candidate.post_id) === String(row.post_id),
      ),
    );
    if (!validSelections) {
      return json(res, 400, { error: "One or more selected candidates are invalid." });
    }

    const insertedVotes = await insertRows("votes", rows);
    if (!insertedVotes || insertedVotes.length !== rows.length) {
      throw new Error("Vote submission was not fully saved. Please try again.");
    }

    const savedVotes = await supabaseRequest("votes", {
      query: { reg_no: `eq.${voter.reg_no}`, select: "id", limit: String(requiredPostIds.length) },
    });
    if (savedVotes.length !== requiredPostIds.length) {
      throw new Error("Vote submission could not be confirmed. Please contact the election administrator.");
    }

    await supabaseRequest("voters", {
      method: "PATCH",
      query: { reg_no: `eq.${voter.reg_no}` },
      body: { ballot_submitted_at: new Date().toISOString() },
    }).catch(() => {});
    return json(res, 201, { message: "Vote submitted successfully." });
  } catch (error) {
    return json(res, 500, { error: error.message || "Could not submit vote." });
  }
}
