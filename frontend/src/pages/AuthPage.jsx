import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import api, { getErrorMessage } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/auth.css";

export default function AuthPage({ mode }) {
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.message) setNotice(location.state.message);
  }, [location.state]);

  useEffect(() => {
    if (mode === "register") {
      setDepartmentsLoading(true);
      api.get("/public/departments")
        .then(({ data }) => {
          setDepartments(data);
          if (!data.length) setFormError("No departments are configured yet. Ask your college administrator to add them.");
        })
        .catch((error) => setFormError(getErrorMessage(error)))
        .finally(() => setDepartmentsLoading(false));
    }
  }, [mode]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setNotice("");
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      if (mode === "login") {
        const { data } = await api.post("/auth/login", values);
        signIn(data.token, data.user);
        navigate("/dashboard");
      } else if (mode === "register") {
        const { data } = await api.post("/auth/register", {
          ...values,
          graduationYear: values.graduationYear ? Number(values.graduationYear) : undefined
        });
        setNotice(data.message);
        if (data.status === "approved") navigate("/login", { state: { message: data.message } });
      } else if (mode === "forgot") {
        const { data } = await api.post("/auth/forgot-password", values);
        setNotice(data.message);
      } else {
        const { data } = await api.post("/auth/reset-password", {
          token: searchParams.get("token"),
          password: values.password
        });
        setNotice(data.message);
        navigate("/login", { state: { message: data.message } });
      }
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const titles = {
    login: ["Welcome back.", "Sign in to pick up where your community left off."],
    register: ["Your people are here.", "Create your account and find your place in the community."],
    forgot: ["A fresh start.", "Enter your email and we’ll send password reset instructions."],
    reset: ["Choose a new password.", "Use at least eight characters to keep your account secure."]
  };

  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <Link className="brand auth-brand" to="/"><span className="brand-mark">AC</span><span>Alumni<span className="brand-accent">Connect</span></span></Link>
        <div className="auth-aside-copy">
          <span className="auth-kicker">ONE CAMPUS. EVERY GENERATION.</span>
          <h1>Good things<br />grow <i>together.</i></h1>
          <p>Stay close to the people and place that helped shape your journey.</p>
        </div>
        <div className="auth-aside-bottom">Your college community, for life.</div>
      </aside>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <Link className="auth-back" to="/">← Back to home</Link>
          <p className="eyebrow eyebrow-blue">{mode === "register" ? "Join the community" : mode === "login" ? "Your community is waiting" : "Account help"}</p>
          <h2>{titles[mode][0]}</h2>
          <p className="auth-intro">{titles[mode][1]}</p>
          {formError && <p className="form-message form-error" role="alert">{formError}</p>}
          {notice && <p className="form-message form-success" role="status">{notice}</p>}
          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "register" && <>
              <label>Full name<input name="name" autoComplete="name" required maxLength="100" /></label>
              <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
              <label>Password<input name="password" type="password" autoComplete="new-password" minLength="8" required /></label>
              <div className="form-row">
                <label>Phone number<input name="phone" type="tel" autoComplete="tel" /></label>
                <label>I'm joining as<select name="role" required defaultValue="student"><option value="student">Student</option><option value="alumni">Alumni</option></select></label>
              </div>
              <label>Department<select name="department" required defaultValue="" disabled={departmentsLoading || !departments.length}>
                <option value="">{departmentsLoading ? "Loading departments..." : "Select your B.Tech branch"}</option>
                {departments.map((department) => <option value={department._id} key={department._id}>{department.name} ({department.code})</option>)}
              </select></label>
              <div className="form-row">
                <label>Course<input name="course" maxLength="100" placeholder="e.g. B.Tech Computer Science" /></label>
                <label>Graduation year<input name="graduationYear" type="number" min="1950" max="2100" /></label>
              </div>
              <label>Enrollment number<input name="enrollmentNumber" maxLength="50" /></label>
              <p className="form-hint">Alumni accounts are reviewed by your department before access is enabled. Faculty and HOD accounts are created by an administrator.</p>
            </>}
            {mode === "login" && <>
              <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
              <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
              <div className="auth-inline"><span>Welcome back to the community</span><Link to="/forgot-password">Forgot password?</Link></div>
            </>}
            {mode === "forgot" && <label>Email address<input name="email" type="email" autoComplete="email" required /></label>}
            {mode === "reset" && <label>New password<input name="password" type="password" autoComplete="new-password" minLength="8" required /></label>}
            <button className="button button-primary auth-submit" type="submit" disabled={busy}>
              {busy ? "Please wait..." : mode === "login" ? "Sign in" : mode === "register" ? "Create account" : mode === "forgot" ? "Send reset instructions" : "Update password"}
              {!busy && <span aria-hidden="true">→</span>}
            </button>
          </form>
          {mode === "login" && <p className="auth-switch">New to Alumni Connect? <Link to="/register">Create an account</Link></p>}
          {mode === "register" && <p className="auth-switch">Already part of the community? <Link to="/login">Sign in</Link></p>}
          {(mode === "forgot" || mode === "reset") && <p className="auth-switch"><Link to="/login">Back to sign in</Link></p>}
        </div>
      </section>
    </div>
  );
}
