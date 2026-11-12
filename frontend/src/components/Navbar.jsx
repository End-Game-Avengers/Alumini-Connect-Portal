import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/navbar.css";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <header className="site-header">
      <nav className="nav-wrap" aria-label="Main navigation">
        <Link className="brand" to="/" aria-label="Alumni Connect home">
          <span className="brand-mark">AC</span>
          <span>Alumni<span className="brand-accent">Connect</span></span>
        </Link>
        <div className="nav-links">
          <NavLink to="/">Home</NavLink>
          {user ? (
            <>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <span className="nav-user">Hi, {user.name.split(" ")[0]}</span>
              <button className="button button-outline button-small" onClick={handleSignOut}>Log out</button>
            </>
          ) : (
            <>
              <a href="/#about">About</a>
              <a href="/#features">Features</a>
              <a href="/#events">Events</a>
              <Link className="nav-login" to="/login">Log in</Link>
              <Link className="button button-primary button-small" to="/register">Join community</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
