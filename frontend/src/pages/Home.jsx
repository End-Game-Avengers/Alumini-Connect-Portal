import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { getErrorMessage } from "../services/api.js";
import "../styles/home.css";

const featureList = [
  { icon: "01", title: "Find your people", text: "Meet graduates who share your department, interests, and ambitions." },
  { icon: "02", title: "Learn from experience", text: "Get practical guidance from alumni who have already made the journey." },
  { icon: "03", title: "Grow together", text: "Discover opportunities, campus events, and the next step in your career." }
];

export default function Home() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactError, setContactError] = useState("");
  const [contactBusy, setContactBusy] = useState(false);

  useEffect(() => {
    api.get("/public/overview")
      .then(({ data }) => setOverview(data))
      .catch((requestError) => setError(getErrorMessage(requestError)));
  }, []);

  async function submitContact(event) {
    event.preventDefault();
    setContactError("");
    setContactMessage("");
    setContactBusy(true);
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      const { data } = await api.post("/public/contact", values);
      setContactMessage(data.message);
      form.reset();
    } catch (requestError) {
      setContactError(getErrorMessage(requestError));
    } finally {
      setContactBusy(false);
    }
  }

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-dot" /> One campus. Every generation.</p>
            <h1>Your college community,<br /><span>for life.</span></h1>
            <p className="hero-description">
              A place where students find guidance, alumni give back, and meaningful connections keep growing.
            </p>
            <div className="hero-actions">
              <Link className="button button-light" to="/register">Join the community <span aria-hidden="true">→</span></Link>
              <a className="hero-secondary" href="#about">Discover Alumni Connect <span aria-hidden="true">↓</span></a>
            </div>
            <div className="hero-social-proof">
              <span className="proof-avatars"><i>S</i><i>A</i><i>F</i></span>
              <span>Students, alumni & faculty<br /><b>building what comes next</b></span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="art-center"><span>AC</span><small>STAY<br />CONNECTED</small></div>
            <div className="orbit-card card-top"><span className="orbit-icon">↗</span><b>New opportunity</b><small>Shared by your alumni</small></div>
            <div className="orbit-card card-bottom"><span className="orbit-icon orbit-icon-gold">✦</span><b>Mentorship that matters</b><small>One conversation can change everything</small></div>
            <div className="art-dot dot-one" /><div className="art-dot dot-two" />
          </div>
        </div>
        <div className="hero-bottom">
          <span>Built around your college. Powered by your people.</span>
          <a href="#features">EXPLORE THE PLATFORM <span>↓</span></a>
        </div>
      </section>

      <section className="stats-strip">
        <div className="stats-intro">A network that<br /><b>keeps moving.</b></div>
        {[
          ["alumni", "Alumni connected"],
          ["students", "Students in community"],
          ["jobs", "Opportunities shared"],
          ["events", "Upcoming events"]
        ].map(([key, label]) => (
          <div className="stat-item" key={key}>
            <strong>{overview ? overview.stats[key].toLocaleString() : "—"}</strong>
            <span>{label}</span>
          </div>
        ))}
        {error && <span className="stats-error" role="status">{error}</span>}
      </section>

      <section className="section about-section" id="about">
        <div className="section-heading">
          <p className="eyebrow eyebrow-blue">A stronger community starts here</p>
          <h2>More than a directory.<br /><span>A community that shows up.</span></h2>
        </div>
        <div className="about-copy">
          <p>Alumni Connect brings students, graduates, faculty, department leaders, and administrators into one welcoming space.</p>
          <p>From a first mentor conversation to a career-making opportunity, the best things happen when we stay connected.</p>
          <Link className="text-link" to="/register">Find your place here <span>→</span></Link>
        </div>
      </section>

      <section className="section features-section" id="features">
        <div className="section-heading section-heading-row">
          <div><p className="eyebrow eyebrow-blue">Make every connection count</p><h2>Good things happen<br /><span>when we connect.</span></h2></div>
          <p>Thoughtful tools for the moments that move your college community forward.</p>
        </div>
        <div className="feature-grid">
          {featureList.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <span className="feature-number">{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
              <span className="feature-arrow" aria-hidden="true">↗</span>
            </article>
          ))}
        </div>
      </section>

      <section className="community-band">
        <div><p className="eyebrow">Good advice travels far</p><h2>Every graduate has a story.<br /><span>Every student has a next step.</span></h2></div>
        <Link className="button button-light" to="/register">Be part of the story <span>→</span></Link>
      </section>

      <section className="section stories-section">
        <div className="section-heading section-heading-row">
          <div><p className="eyebrow eyebrow-blue">The people behind the progress</p><h2>Meet the community<br /><span>you can grow with.</span></h2></div>
          <Link className="text-link" to="/register">Connect with alumni <span>→</span></Link>
        </div>
        <div className="story-grid">
          {overview?.alumni?.length ? overview.alumni.map(({ user, profile }) => (
            <article className="story-card" key={user._id}>
              <div className="story-avatar">{user.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</div>
              <div><span className="story-tag">ALUMNI COMMUNITY</span><h3>{user.name}</h3>
                <p>{profile.designation || "Graduate"}{profile.company ? ` · ${profile.company}` : ""}</p>
                <small>{user.department?.name || "Alumni Connect"}{user.graduationYear ? ` · Class of ${user.graduationYear}` : ""}</small>
              </div>
            </article>
          )) : <p className="empty-note">{overview ? "Alumni profiles will appear here as graduates join the community." : "Loading community profiles..."}</p>}
        </div>
      </section>

      <section className="section events-section" id="events">
        <div className="section-heading section-heading-row">
          <div><p className="eyebrow eyebrow-blue">Make time for what matters</p><h2>Coming up in<br /><span>our community.</span></h2></div>
          <Link className="text-link" to="/login">See your events <span>→</span></Link>
        </div>
        {overview?.events?.length ? (
          <div className="event-preview-grid">{overview.events.map((event) => (
            <article className="event-preview" key={event._id}>
              <time dateTime={event.date}><b>{new Date(event.date).getDate()}</b><span>{new Date(event.date).toLocaleString("en", { month: "short" }).toUpperCase()}</span></time>
              <div><span className="story-tag">{event.type.replaceAll("-", " ").toUpperCase()}</span><h3>{event.title}</h3><p>{event.location}</p></div>
              <span className="feature-arrow">↗</span>
            </article>
          ))}</div>
        ) : <p className="empty-note">{overview ? "New events will be listed here as they are announced." : "Loading upcoming events..."}</p>}
      </section>

      <section className="contact-band" id="contact">
        <div><p className="eyebrow">Your community is just getting started</p><h2>Stay connected.<br /><span>See where it takes you.</span></h2><Link className="button button-light" to="/register">Create your account <span>→</span></Link></div>
        <form className="contact-form" onSubmit={submitContact}>
          <h3>Talk to your college community</h3>
          <label>Your name<input name="name" required maxLength="100" /></label>
          <label>Email address<input name="email" type="email" required maxLength="254" /></label>
          <label>How can we help?<textarea name="message" rows="3" minLength="10" maxLength="400" required /></label>
          {contactError && <p className="contact-feedback contact-feedback-error" role="alert">{contactError}</p>}
          {contactMessage && <p className="contact-feedback" role="status">{contactMessage}</p>}
          <button className="button button-light" disabled={contactBusy}>{contactBusy ? "Sending..." : "Send message"} <span>→</span></button>
        </form>
      </section>

      <footer className="site-footer">
        <Link className="brand brand-footer" to="/"><span className="brand-mark">AC</span><span>Alumni<span className="brand-accent">Connect</span></span></Link>
        <p>One campus. Every generation.</p>
        <div><a href="#about">About</a><a href="#features">Features</a><a href="#events">Events</a><a href="#contact">Contact</a></div>
        <small>© {new Date().getFullYear()} Alumni Connect. Built for your college community.</small>
      </footer>
    </div>
  );
}
