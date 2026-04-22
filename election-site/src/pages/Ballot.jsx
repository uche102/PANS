import React, { useState } from "react";
import { ArrowLeft, CheckCircle, User, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import welcome from "../assets/welcome.jpeg";

const Ballot = () => {
  const navigate = useNavigate();
  const [selections, setSelections] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const voterRegNo = localStorage.getItem("voterRegNo");

  const electionData = [
    {
      office: "2027 ELECTION",
      question: "Who do you think will win the 2027 elections?",
      candidates: [
        {
          id: 1,
          name: "Peter Obi",
          slogan: "Labor Party",
          image:
            "https://upload.wikimedia.org/wikipedia/commons/b/b3/Peter_Obi_Official_Portrait.jpg",
        },
        {
          id: 2,
          name: "Bola Ahmed Tinubu",
          slogan: "APC",
          image:
            "https://upload.wikimedia.org/wikipedia/commons/2/22/Bola_Tinubu_portrait.jpg",
        },
        {
          id: 3,
          name: "Atiku Abubakar",
          slogan: "PDP",
          image:
            "https://upload.wikimedia.org/wikipedia/commons/1/1b/Atiku_Abubakar-2010.jpg",
        },
      ],
    },
    {
      office: "SQUID GAME",
      question: "What Season of Squid Game was the best?",
      candidates: [
        {
          id: 4,
          name: "Season One",
          image:
            "https://m.media-amazon.com/images/M/MV5BYWE3MDVkN2EtNjQ5MS00ZDQ4LTliNzYtMjc2YWMzMDEwMTA3XkEyXkFqcGdeQXVyMTEyMjM2NDc2._V1_.jpg",
        },
        {
          id: 5,
          name: "Season Two",
          image:
            "https://m.media-amazon.com/images/M/MV5BN2E1OTkyYzYtODkyOC00OTUyLTkxN2EtMmU1OTM4MjQxYWEzXkEyXkFqcGdeQXVyMTEyMjM2NDc2._V1_.jpg",
        },
        {
          id: 6,
          name: "Season Three",
          image:
            "https://m.media-amazon.com/images/M/MV5BNmU2MjI2ZWMtOTYwZi00OTNhLWE0NjctYTVlMTA0MTYyN2FkXkEyXkFqcGdeQXVyMTEyMjM2NDc2._V1_.jpg",
        },
      ],
    },
    {
      office: "DIDDY SENTENCE",
      question: "How long does Diddy deserve to serve time in Prison?",
      candidates: [
        {
          id: 7,
          name: "4 Years",
          image: "https://cdn-icons-png.flaticon.com/512/3233/3233515.png",
        },
        {
          id: 8,
          name: "15 Years",
          image: "https://cdn-icons-png.flaticon.com/512/3233/3233515.png",
        },
        {
          id: 9,
          name: "Life Imprisonment",
          image:
            "https://upload.wikimedia.org/wikipedia/commons/d/de/Sean_Combs_2010.jpg",
        },
      ],
    },
  ];

  const handleSelect = (office, candidateId) => {
    setSelections({ ...selections, [office]: candidateId });
  };

  const handleSubmitVotes = async () => {
    const totalOffices = electionData.length;
    const selectedCount = Object.keys(selections).length;

    if (selectedCount < totalOffices) {
      alert(
        `Please vote for all offices! You have missed ${totalOffices - selectedCount} positions.`,
      );
      return;
    }

    if (!voterRegNo) {
      alert("Session expired. Please verify your OTP again.");
      navigate("/");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("http://localhost:8000/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regNo: voterRegNo,
          candidateIds: Object.values(selections),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        navigate("/success");
      } else {
        alert(result.error || result.message || "Failed to submit vote.");
      }
    } catch (err) {
      console.error("Connection Error:", err);
      alert(
        "Backend server is not reachable. Ensure 'node server.js' is running.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="ballot-page"
      style={{
        backgroundImage: `url(${welcome})`,
        minHeight: "100vh",
        backgroundAttachment: "fixed",
      }}
    >
      <header className="ballot-header">
        <button onClick={() => navigate("/")} className="exit-button">
          <ArrowLeft size={18} /> LOGOUT
        </button>
        <div className="header-info">
          <h1>PANS UNIZIK E-BALLOT</h1>
          <p>2026 GENERAL ELECTIONS</p>
        </div>
      </header>

      <main className="ballot-container">
        <div className="instruction-card">
          <CheckCircle size={20} color="var(--accent)" />
          <p>Review the candidates and select one for each executive office.</p>
        </div>

        {electionData.map((section) => (
          <section key={section.office} className="office-section">
            <h2 className="office-title">
              <Award size={20} /> {section.office}
              <p className="poll-question">{section.question}</p>
            </h2>
            <div className="candidates-grid">
              {section.candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className={`candidate-card ${
                    selections[section.office] === candidate.id
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => handleSelect(section.office, candidate.id)}
                >
                  <div className="candidate-photo">
                    {candidate.image ? (
                      <img
                        src={candidate.image}
                        alt={candidate.name}
                        style={{
                          width: "100px",
                          height: "100px",
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div className="photo-placeholder">
                        <User size={40} />
                      </div>
                    )}
                  </div>
                  <div className="candidate-info">
                    <h3>{candidate.name}</h3>
                    {candidate.slogan && <small>{candidate.slogan}</small>}
                  </div>
                  <div className="selection-indicator">
                    {selections[section.office] === candidate.id
                      ? "SELECTED"
                      : "TAP TO SELECT"}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="submit-section">
          <button
            className="primary-button finalize-btn"
            onClick={handleSubmitVotes}
            disabled={submitting}
          >
            {submitting ? "SUBMITTING..." : "SUBMIT ALL VOTES"}
          </button>
        </div>
      </main>
    </div>
  );
};

export default Ballot;
