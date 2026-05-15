import { json, methodNotAllowed, readBody } from "./_lib/http.js";
import { getElectionStatus } from "./_lib/election-status.js";
import { inferEligibleLevel } from "./_lib/post-order.js";
import { requireVoter } from "./_lib/session.js";
import { getSingle, insertRows, supabaseRequest } from "./_lib/supabase.js";

function normalizeLevel(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/LEVEL$/, "L")
    .replace(/LVL$/, "L");
}

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

    const voterRecord = voter.level
      ? voter
      : await getSingle("voters", { reg_no: `eq.${voter.reg_no}` });
    if (!voterRecord) {
      return json(res, 404, { error: "Voter not found." });
    }

    let posts;
    try {
      posts = await supabaseRequest("posts", {
        query: { select: "id,title,eligible_level", is_active: "eq.true" },
      });
    } catch (error) {
      if (!String(error.message || "").includes("eligible_level")) throw error;
      posts = await supabaseRequest("posts", {
        query: { select: "id,title", is_active: "eq.true" },
      });
    }
    const voterLevel = normalizeLevel(voterRecord.level);
    const eligiblePosts = posts.filter((post) => {
      const eligibleLevel = normalizeLevel(inferEligibleLevel(post));
      return !eligibleLevel || eligibleLevel === voterLevel;
    });
    const ineligiblePostIds = posts
      .filter((post) => !eligiblePosts.includes(post))
      .map((post) => String(post.id));
    const requiredPostIds = eligiblePosts.map((post) => String(post.id));
    const selectedPostIds = Object.keys(selections);

    if (
      requiredPostIds.length === 0 ||
      selectedPostIds.length !== requiredPostIds.length ||
      requiredPostIds.some((postId) => !selectedPostIds.includes(postId)) ||
      selectedPostIds.some((postId) => ineligiblePostIds.includes(postId))
    ) {
      return json(res, 400, { error: "Please vote for every post available to your level." });
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
