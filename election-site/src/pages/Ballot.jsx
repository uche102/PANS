import { CheckCircle, LogOut, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import welcome from "../assets/welcome.jpeg";
import { api } from "../lib/api";

export default function Ballot() {
  const navigate = useNavigate();
  const [voter, setVoter] = useState(null);
  const [posts, setPosts] = useState([]);
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const storedVoter = sessionStorage.getItem("pansVoter");
      const hasToken = sessionStorage.getItem("pansVoterToken");

      if (!storedVoter || !hasToken) {
        navigate("/", { replace: true });
        return;
      }

      try {
        const [meResult, election] = await Promise.allSettled([api.me(), api.election()]);
        const me = meResult.status === "fulfilled" ? meResult.value : null;

        if (me?.hasVoted) {
          navigate("/success", { replace: true });
          return;
        }

        setVoter(
          me?.voter ? me.voter : JSON.parse(storedVoter),
        );
        if (election.status === "fulfilled") {
          setPosts(election.value.posts);
        } else {
          throw election.reason;
        }
      } catch {
        sessionStorage.removeItem("pansVoter");
        sessionStorage.removeItem("pansVoterToken");
        navigate("/", { replace: true });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [navigate]);

  const selectedCount = Object.keys(selections).length;
  const canSubmit = posts.length > 0 && selectedCount === posts.length;

  const voterLabel = useMemo(() => {
    if (!voter) return "";
    return [voter.name, voter.reg_no].filter(Boolean).join(" · ");
  }, [voter]);

  async function submitVote() {
    setError("");
    if (!canSubmit) {
      setError("Select one candidate for every post before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      await api.vote(selections);
      navigate("/success");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function logout() {
    sessionStorage.removeItem("pansVoter");
    sessionStorage.removeItem("pansVoterToken");
    navigate("/");
  }

  if (loading) {
    return <div className="loading-screen">Loading ballot...</div>;
  }

  return (
    <div className="app-page" style={{ backgroundImage: `url(${welcome})` }}>
      <div className="app-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">PANS UniZik</p>
            <h1>Election Ballot</h1>
            <p>{voterLabel}</p>
          </div>
          <button className="icon-button" onClick={logout} title="Logout">
            <LogOut size={18} />
          </button>
        </header>

        <div className="status-row">
          <CheckCircle size={18} />
          <span>
            {selectedCount} of {posts.length} posts selected
          </span>
        </div>

        {posts.length === 0 && (
          <section className="empty-state">No active election posts have been added yet.</section>
        )}

        <div className="post-list">
          {posts.map((post) => (
            <section
              className={`post-section ${post.title.toLowerCase().includes("squid game") ? "post-section-featured" : ""}`}
              key={post.id}
            >
              <h2>{post.title}</h2>
              <div className="candidate-grid">
                {post.candidates.map((candidate) => {
                  const selected = selections[post.id] === candidate.id;
                  return (
                    <button
                      type="button"
                      key={candidate.id}
                      className={`candidate-card ${selected ? "selected" : ""} ${
                        post.title.toLowerCase().includes("squid game") ? "candidate-card-large" : ""
                      }`}
                      onClick={() =>
                        setSelections((current) => ({ ...current, [post.id]: candidate.id }))
                      }
                    >
                      <div className="candidate-avatar">
                        {candidate.image_url ? (
                          <img src={candidate.image_url} alt={candidate.name} />
                        ) : (
                          <UserRound size={post.title.toLowerCase().includes("squid game") ? 48 : 39} />
                        )}
                      </div>
                      <strong>{candidate.name}</strong>
                      {candidate.tagline && <span>{candidate.tagline}</span>}
                      <small>{selected ? "Selected" : "Tap to select"}</small>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {error && <p className="error-text">{error}</p>}
        <div className="sticky-action">
          <button className="primary-button" disabled={!canSubmit || submitting} onClick={submitVote}>
            {submitting ? "Submitting..." : "Submit Ballot"}
          </button>
        </div>
      </div>
    </div>
  );
}
