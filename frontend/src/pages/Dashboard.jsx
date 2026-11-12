import { useCallback, useEffect, useMemo, useState } from "react";
import api, { getErrorMessage } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getTabs, tabLabels } from "../dashboard/roleTabs.js";
import "../styles/dashboard.css";

const roleTitles = {
  student: "Student space",
  alumni: "Alumni space",
  faculty: "Faculty workspace",
  hod: "Department workspace",
  admin: "College administration"
};
function ConnectionSection({ user, connections, action }) {
  const isRecipient = (connection) => String(connection.recipient?._id) === String(user._id);
  return <>
    <div className="section-lead"><div><span className="eyebrow eyebrow-blue">BUILD YOUR CIRCLE</span><h2>Connections</h2><p>Requests and accepted connections from your community.</p></div></div>
    <div className="table-wrap"><table><thead><tr><th>Community member</th><th>Request direction</th><th>Status</th><th>Action</th></tr></thead><tbody>
      {connections.map((connection) => {
        const incoming = isRecipient(connection);
        const person = incoming ? connection.requester : connection.recipient;
        return <tr key={connection._id}><td>{person?.name || "Community member"} <span className="capitalize">({person?.role || "member"})</span></td><td>{incoming ? "Received" : "Sent"}</td><td><span className={`status-pill status-${connection.status}`}>{connection.status}</span></td><td>{incoming && connection.status === "pending" ? <div className="table-actions"><button onClick={() => action(`/connections/${connection._id}`, { status: "accepted" }, "patch")}>Accept</button><button className="text-danger" onClick={() => action(`/connections/${connection._id}`, { status: "rejected" }, "patch")}>Decline</button></div> : "—"}</td></tr>;
      })}
    </tbody></table></div>{!connections.length && <p className="empty-note">Connect with an alum to get your network started.</p>}
  </>;
}

function initials(name = "") {
  return name.split(" ").map((word) => word[0]).slice(0, 2).join("").toUpperCase();
}

function ResourceSection({ user, resources, action, submitForm }) {
  const canPost = ["faculty", "hod", "admin"].includes(user.role);
  return <>
    <div className="section-lead"><div><span className="eyebrow eyebrow-blue">TOOLS FOR THE NEXT THING YOU LEARN</span><h2>Learning resources</h2><p>Guides, courses, and useful links shared by your faculty.</p></div></div>
    {canPost && <details className="form-disclosure"><summary>+ Share a resource</summary><form className="compact-form" onSubmit={(event) => submitForm(event, "/resources")}><Field label="Resource title" name="title" required /><Field label="Link" name="url" type="url" required /><SelectField label="Resource type" name="type" options={[["article", "Article"], ["course", "Course"], ["video", "Video"], ["document", "Document"], ["other", "Other"]]} /><TextArea label="Description" name="description" /><button className="button button-primary">Share resource</button></form></details>}
    <div className="resource-grid">{resources.map((resource) => <article className="dash-card resource-card" key={resource._id}><span className="story-tag">{resource.type}</span><h3>{resource.title}</h3><p>{resource.description || "A resource shared with your college community."}</p><small>Shared by {resource.author?.name || "Faculty"} · {dateLabel(resource.createdAt)}</small><div className="resource-actions"><a className="button button-outline button-small" href={resource.url} target="_blank" rel="noreferrer">Open resource ↗</a>{user.role === "admin" && <button className="text-button text-danger" onClick={() => action(`/resources/${resource._id}`, {}, "delete")}>Remove</button>}</div></article>)}</div>
    {!resources.length && <p className="empty-note">Faculty learning resources will appear here.</p>}
  </>;
}

function dateLabel(date) {
  return date ? new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
}

function Message({ error, success }) {
  if (!error && !success) return null;
  return <p className={`form-message ${error ? "form-error" : "form-success"}`} role={error ? "alert" : "status"}>{error || success}</p>;
}

function Field({ label, name, type = "text", required = false, placeholder = "", defaultValue, min, max, minLength }) {
  return <label>{label}<input name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue} min={min} max={max} minLength={minLength} /></label>;
}

function TextArea({ label, name, required = false, placeholder = "", defaultValue }) {
  return <label>{label}<textarea name={name} required={required} rows="3" placeholder={placeholder} defaultValue={defaultValue} /></label>;
}

function SelectField({ label, name, options, required = false }) {
  return <label>{label}<select name={name} required={required} defaultValue={options[0][0]}>{options.map(([value, title]) => <option value={value} key={value}>{title}</option>)}</select></label>;
}

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState({
    profile: {}, alumni: [], students: [], mentors: [], jobs: [], events: [], announcements: [],
    connections: [], mentorships: [], notifications: [], resources: [], users: [], pending: [],
    stats: null, departments: [], applications: [], activities: [], reports: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const tabs = useMemo(() => getTabs(user.role), [user.role]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    const requests = [
      ["profile", api.get("/auth/me").then(({ data: result }) => {
        setUser(result.user);
        return result.profile || {};
      })],
      ["jobs", api.get("/jobs").then(({ data: result }) => result)],
      ["events", api.get("/events").then(({ data: result }) => result)],
      ["announcements", api.get("/announcements").then(({ data: result }) => result)],
      ["connections", api.get("/connections").then(({ data: result }) => result)],
      ["mentorships", api.get("/mentorship").then(({ data: result }) => result)],
      ["notifications", api.get("/notifications").then(({ data: result }) => result)],
      ["resources", api.get("/resources").then(({ data: result }) => result)],
      ["departments", api.get("/public/departments").then(({ data: result }) => result)]
    ];
    if (["student", "alumni", "admin"].includes(user.role)) {
      requests.push(["alumni", api.get("/alumni").then(({ data: result }) => result)]);
    }
    if (["student", "alumni"].includes(user.role)) {
      requests.push(["mentors", api.get("/mentors").then(({ data: result }) => result)]);
    }
    if (user.role === "alumni") requests.push(["students", api.get("/students").then(({ data: result }) => result)]);
    if (["faculty", "hod", "admin"].includes(user.role)) {
      requests.push(["users", api.get("/users").then(({ data: result }) => result)]);
    }
    if (["admin", "hod"].includes(user.role)) {
      requests.push(["stats", api.get("/admin/stats").then(({ data: result }) => result)]);
      requests.push(["pending", api.get("/admin/pending").then(({ data: result }) => result)]);
      requests.push(["reports", api.get("/admin/reports").then(({ data: result }) => result)]);
    }
    if (user.role === "admin") requests.push(["activities", api.get("/admin/activity").then(({ data: result }) => result)]);
    if (["student", "alumni", "faculty", "hod", "admin"].includes(user.role)) {
      requests.push(["applications", api.get("/applications").then(({ data: result }) => result)]);
    }
    const results = await Promise.allSettled(requests.map(([, request]) => request));
    const updates = {};
    results.forEach((result, index) => {
      const key = requests[index][0];
      if (result.status === "fulfilled") updates[key] = result.value;
      else setError((current) => current || `${key}: ${getErrorMessage(result.reason)}`);
    });
    setData((current) => ({ ...current, ...updates }));
    setLoading(false);
  }, [setUser, user.role]);

  useEffect(() => { refresh(); }, [refresh]);

  async function submitForm(event, path, method = "post", transform = (values) => values) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const form = event.currentTarget;
    const values = transform(Object.fromEntries(new FormData(form).entries()));
    try {
      const response = method === "patch" ? await api.patch(path, values) : await api.post(path, values);
      setSuccess(response.data.message || "Your changes have been saved.");
      form.reset();
      await refresh();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function action(path, body, method = "post") {
    if (method === "delete" && !window.confirm("Remove this item? This action cannot be undone.")) return;
    setError("");
    setSuccess("");
    try {
      const response = method === "patch" ? await api.patch(path, body) : method === "delete" ? await api.delete(path) : await api.post(path, body);
      setSuccess(response.data.message || "Your request is complete.");
      await refresh();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  const searchAlumni = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const filters = Object.fromEntries(new FormData(event.currentTarget).entries());
      const { data: alumni } = await api.get("/alumni", { params: { ...filters, search } });
      setData((current) => ({ ...current, alumni }));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const filteredPeople = user.role === "hod"
    ? data.users.filter((person) => person.role !== "admin")
    : data.users.filter((person) => person.role === "student" || person.role === "alumni");

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-heading"><span className="sidebar-mark">AC</span><div><b>Alumni Connect</b><small>{roleTitles[user.role]}</small></div></div>
        <nav className="dashboard-nav" aria-label="Dashboard sections">
          {tabs.map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}><span className="nav-indicator" />{tabLabels[tab]}</button>)}
        </nav>
        <div className="sidebar-profile">
          <div className="avatar">{initials(user.name)}</div>
          <div><b>{user.name}</b><small>{user.role.toUpperCase()}</small></div>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div><span className="dashboard-breadcrumb">YOUR COMMUNITY <span>/</span> {tabLabels[activeTab].toUpperCase()}</span><h1>{tabLabels[activeTab]}</h1></div>
          <div className="topbar-actions"><span className="topbar-date">{new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span><button className="notification-button" title="Notifications" onClick={() => setActiveTab("overview")}>♧<i>{data.notifications.filter((item) => !item.read).length}</i></button></div>
        </header>
        <div className="dashboard-content">
          <Message error={error} success={success} />
          {loading && <div className="loading-inline">Refreshing your community...</div>}
          {!loading && activeTab === "overview" && <Overview user={user} data={data} setTab={setActiveTab} action={action} />}
          {activeTab === "directory" && <Directory currentUser={user} alumni={data.alumni} departments={data.departments} search={search} setSearch={setSearch} onSearch={searchAlumni} action={action} />}
          {activeTab === "connections" && <ConnectionSection user={user} connections={data.connections} action={action} />}
          {activeTab === "mentorship" && <MentorshipSection user={user} mentors={data.mentors} requests={data.mentorships} action={action} />}
          {activeTab === "opportunities" && <OpportunitySection user={user} jobs={data.jobs} applications={data.applications} action={action} submitForm={submitForm} />}
          {activeTab === "events" && <EventSection user={user} events={data.events} action={action} submitForm={submitForm} />}
          {activeTab === "announcements" && <AnnouncementSection user={user} items={data.announcements} action={action} submitForm={submitForm} />}
          {activeTab === "resources" && <ResourceSection user={user} resources={data.resources} action={action} submitForm={submitForm} />}
          {activeTab === "people" && <PeopleSection user={user} users={user.role === "alumni" ? data.students : filteredPeople} action={action} />}
          {activeTab === "manage" && <ManagementSection user={user} data={data} action={action} submitForm={submitForm} />}
          {activeTab === "profile" && <ProfileSection user={user} profile={data.profile} departments={data.departments} submitForm={submitForm} />}
        </div>
      </section>
    </div>
  );
}

function Overview({ user, data, setTab, action }) {
  const stats = data.stats;
  const cards = user.role === "admin"
    ? [["Students", stats?.students ?? "—"], ["Alumni", stats?.alumni ?? "—"], ["Faculty", stats?.faculty ?? "—"], ["HODs", stats?.hods ?? "—"], ["Pending approvals", stats?.pendingRegistrations ?? "—"], ["Opportunities", stats?.jobs ?? data.jobs.length], ["Upcoming events", stats?.events ?? data.events.length]]
    : user.role === "hod"
      ? [["Students", stats?.students ?? "—"], ["Alumni", stats?.alumni ?? "—"], ["Pending approvals", stats?.pendingRegistrations ?? "—"], ["Faculty", stats?.faculty ?? "—"]]
    : [["Community", user.role === "alumni" ? "Alumni" : "Your campus"], ["Opportunities", data.jobs.length], ["Upcoming events", data.events.length], ["Connections", data.connections.filter((item) => item.status === "accepted").length]];
  return <>
    <div className="welcome-panel"><div><p className="eyebrow">YOUR COMMUNITY, ALL IN ONE PLACE</p><h2>Good to see you, {user.name.split(" ")[0]}.</h2><p>Keep growing your network, sharing what you know, and finding what’s next.</p></div><span className="welcome-shape">AC</span></div>
    <div className="metric-grid">{cards.map(([label, value]) => <article className="metric-card" key={label}><span>{label}</span><b>{value}</b><small>Live community data</small></article>)}</div>
    <div className="dashboard-grid">
      <section className="dash-card"><div className="dash-card-heading"><div><span className="eyebrow eyebrow-blue">NEXT ON THE CALENDAR</span><h3>Upcoming events</h3></div><button className="text-button" onClick={() => setTab("events")}>See all →</button></div>
        {data.events.slice(0, 3).map((event) => <div className="mini-row" key={event._id}><time className="mini-date">{new Date(event.date).getDate()}<small>{new Date(event.date).toLocaleString("en", { month: "short" })}</small></time><div><b>{event.title}</b><small>{dateLabel(event.date)} · {event.location}</small></div><button className="button button-outline button-small" onClick={() => action(`/events/${event._id}/register`, {})}>Join</button></div>)}
        {!data.events.length && <p className="empty-note">No upcoming events yet.</p>}
      </section>
      <section className="dash-card"><div className="dash-card-heading"><div><span className="eyebrow eyebrow-blue">FROM YOUR COMMUNITY</span><h3>Latest announcements</h3></div><button className="text-button" onClick={() => setTab("announcements")}>See all →</button></div>
        {data.announcements.slice(0, 3).map((item) => <div className="announcement-row" key={item._id}><span className="announcement-dot" /><div><b>{item.title}</b><p>{item.body}</p><small>{item.author?.name || "Community"} · {dateLabel(item.createdAt)}</small></div></div>)}
        {!data.announcements.length && <p className="empty-note">Announcements from your college will appear here.</p>}
      </section>
    </div>
    <section className="dash-card opportunity-preview"><div className="dash-card-heading"><div><span className="eyebrow eyebrow-blue">A GOOD NEXT STEP</span><h3>Recently shared opportunities</h3></div><button className="text-button" onClick={() => setTab("opportunities")}>Browse opportunities →</button></div>
      <div className="compact-job-grid">{data.jobs.slice(0, 3).map((job) => <div className="compact-job" key={job._id}><span className="job-type">{job.type}</span><b>{job.title}</b><small>{job.company} · {job.location || "Location flexible"}</small></div>)}</div>
      {!data.jobs.length && <p className="empty-note">New jobs and internships will show here when shared.</p>}
    </section>
    <section className="notification-strip"><div><span className="eyebrow eyebrow-blue">YOUR UPDATES</span><b>{data.notifications.filter((item) => !item.read).length ? `${data.notifications.filter((item) => !item.read).length} new notification(s)` : "You’re all caught up"}</b></div><button className="text-button" onClick={() => action("/notifications/read-all", {}, "patch")}>Mark all as read</button></section>
    <section className="dash-card notification-list"><div className="dash-card-heading"><div><span className="eyebrow eyebrow-blue">RECENT MESSAGES</span><h3>Notifications</h3></div></div>{data.notifications.slice(0, 5).map((notification) => <div className="announcement-row" key={notification._id}><span className={`announcement-dot ${notification.read ? "notification-read" : ""}`} /><div><p>{notification.message}</p><small>{dateLabel(notification.createdAt)}</small></div></div>)}{!data.notifications.length && <p className="empty-note">Your community messages will appear here.</p>}</section>
  </>;
}

function Directory({ currentUser, alumni, departments, search, setSearch, onSearch, action }) {
  const [selected, setSelected] = useState("");
  return <>
    <div className="section-lead"><div><span className="eyebrow eyebrow-blue">PEOPLE WHO HAVE BEEN THERE</span><h2>Alumni directory</h2><p>Find a familiar face, an inspiring career, or your next connection.</p></div><span className="count-pill">{alumni.length} profiles</span></div>
    <form className="directory-search directory-filter-form" onSubmit={onSearch}>
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search alumni by name" aria-label="Search alumni by name" />
      <select name="department" defaultValue="" aria-label="Filter by department"><option value="">All departments</option>{departments.map((department) => <option value={department._id} key={department._id}>{department.name}</option>)}</select>
      <input name="year" type="number" placeholder="Graduation year" aria-label="Filter by graduation year" />
      <input name="company" placeholder="Company" aria-label="Filter by company" />
      <button className="button button-primary">Search directory</button>
    </form>
    <div className="profile-grid">{alumni.map(({ user, profile }) => <article className="alumni-card" key={user._id}>
      <div className="profile-card-top"><div className="profile-avatar">{profile.profileImage ? <img src={profile.profileImage} alt="" /> : initials(user.name)}</div><span className="profile-chip">{user.department?.name || "Alumni"}</span></div>
      <h3>{user.name}</h3><p className="profile-role">{profile.designation || "Graduate"}{profile.company ? ` at ${profile.company}` : ""}</p>
      <p className="profile-meta">{user.department?.name || "Department not listed"}{user.graduationYear ? ` · Class of ${user.graduationYear}` : ""}</p>
      <div className="skill-list">{(profile.skills || []).slice(0, 4).map((skill) => <span key={skill}>{skill}</span>)}</div>
      <button className="text-button profile-view-button" onClick={() => setSelected(selected === user._id ? "" : user._id)}>{selected === user._id ? "Hide profile" : "View full profile"} ↓</button>
      {selected === user._id && <div className="profile-expanded">
        {profile.bio && <p>{profile.bio}</p>}
        <p><b>Experience:</b> {profile.experience || 0} years</p>
        {!!profile.achievements?.length && <p><b>Achievements:</b> {profile.achievements.join(", ")}</p>}
      </div>}
      <div className="profile-card-actions">{["student", "alumni"].includes(currentUser.role) && <button className="button button-primary button-small" onClick={() => action("/connections", { recipient: user._id })}>Connect</button>}
        {currentUser.role === "student" && profile.availableForMentorship && <button className="button button-outline button-small" onClick={() => action("/mentorship", { alumni: user._id, message: "I would appreciate your guidance." })}>Ask for mentorship</button>}</div>
    </article>)}</div>
    {!alumni.length && <p className="empty-note">No approved alumni profiles match your search yet.</p>}
  </>;
}

function MentorshipSection({ user, mentors, requests, action }) {
  return <>
    <div className="section-lead"><div><span className="eyebrow eyebrow-blue">LEARN FROM SOMEONE WHO'S BEEN THERE</span><h2>Mentorship</h2><p>Build a meaningful connection around your next step.</p></div></div>
    {user.role === "student" && <><h3 className="subsection-title">Available mentors</h3><div className="profile-grid">{mentors.map((mentor) => <article className="alumni-card" key={mentor._id}><div className="profile-card-top"><div className="profile-avatar">{initials(mentor.user.name)}</div><span className="profile-chip">AVAILABLE</span></div><h3>{mentor.user.name}</h3><p className="profile-role">{mentor.designation || "Alumni mentor"}{mentor.company ? ` · ${mentor.company}` : ""}</p><p className="profile-meta">{mentor.user.department?.name || ""}</p><button className="button button-primary button-small" onClick={() => action("/mentorship", { alumni: mentor.user._id, message: "I would appreciate your guidance." })}>Request mentorship</button></article>)}</div>{!mentors.length && <p className="empty-note">No mentors are currently available.</p>}</>}
    <h3 className="subsection-title">Requests & active connections</h3>
    <div className="table-wrap"><table><thead><tr><th>Student</th><th>Alumni mentor</th><th>Message</th><th>Status</th><th>Action</th></tr></thead><tbody>
      {requests.map((request) => <tr key={request._id}><td>{request.student?.name || "You"}</td><td>{request.alumni?.name || "You"}</td><td>{request.message || "—"}</td><td><span className={`status-pill status-${request.status}`}>{request.status}</span></td><td>{user.role === "alumni" && request.status === "pending" && request.alumni?._id === user._id ? <div className="table-actions"><button onClick={() => action(`/mentorship/${request._id}`, { status: "accepted" }, "patch")}>Accept</button><button onClick={() => action(`/mentorship/${request._id}`, { status: "rejected" }, "patch")}>Decline</button></div> : "—"}</td></tr>)}
    </tbody></table></div>{!requests.length && <p className="empty-note">Your mentorship requests will appear here.</p>}
  </>;
}

function OpportunitySection({ user, jobs, applications, action, submitForm }) {
  const canPost = ["alumni", "faculty", "hod", "admin"].includes(user.role);
  const applied = new Set(applications.map((application) => String(application.job?._id)));
  const [search, setSearch] = useState("");
  const filteredJobs = jobs.filter((job) => `${job.title} ${job.company} ${job.location || ""}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <div className="section-lead"><div><span className="eyebrow eyebrow-blue">YOUR NEXT OPPORTUNITY</span><h2>Jobs & internships</h2><p>Explore opportunities shared by the Alumni Connect community.</p></div><span className="count-pill">{jobs.length} open</span></div>
    <div className="directory-search"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search role, company, or location" aria-label="Search opportunities" /></div>
    {canPost &&     <details className="form-disclosure"><summary>+ Share an opportunity</summary><form className="compact-form" onSubmit={(event) => submitForm(event, "/jobs", "post", (values) => ({ ...values, applicationDeadline: values.applicationDeadline || undefined, skills: values.skills ? values.skills.split(",").map((skill) => skill.trim()).filter(Boolean) : [] }))}>
      <Field label="Role title" name="title" required /><Field label="Company" name="company" required /><SelectField label="Opportunity type" name="type" options={[["job", "Full-time job"], ["internship", "Internship"]]} /><Field label="Location" name="location" /><Field label="Compensation" name="compensation" placeholder="Optional" /><Field label="Application deadline" name="applicationDeadline" type="date" /><Field label="Application link" name="applicationLink" type="url" /><Field label="Skills (comma separated)" name="skills" /><TextArea label="Description" name="description" required /><TextArea label="Eligibility" name="eligibility" /><button className="button button-primary">Publish opportunity</button>
    </form></details>}
    <div className="job-list">{filteredJobs.map((job) => <article className="job-card" key={job._id}><div className="job-card-main"><span className={`job-type job-${job.type}`}>{job.type}</span><h3>{job.title}</h3><b>{job.company}</b><p>{job.description}</p><div className="job-details"><span>⌖ {job.location || "Location flexible"}</span>{job.compensation && <span>◷ {job.compensation}</span>}{job.applicationDeadline && <span>Apply by {dateLabel(job.applicationDeadline)}</span>}</div><div className="skill-list">{(job.skills || []).map((skill) => <span key={skill}>{skill}</span>)}</div></div>
      <div className="job-card-actions">{user.role === "student" && (applied.has(String(job._id)) ? <span className="status-pill status-accepted">Applied</span> : <InternalApply job={job} action={action} />)}{user.role === "student" && job.applicationLink && <a className="text-button" href={job.applicationLink} target="_blank" rel="noreferrer">External application ↗</a>}{["admin", "hod"].includes(user.role) && <button className="text-button text-danger" onClick={() => action(`/jobs/${job._id}`, {}, "delete")}>Remove</button>}</div>
    </article>)}</div>    {!filteredJobs.length && <p className="empty-note">{jobs.length ? "No opportunities match your search." : "No open opportunities yet."}</p>}
    {user.role === "student" && <section className="dash-card application-card"><h3>Your applications</h3>{applications.map((application) => <div className="mini-row" key={application._id}><div><b>{application.job?.title}</b><small>{application.job?.company}</small></div><span className={`status-pill status-${application.status}`}>{application.status}</span></div>)}{!applications.length && <p className="empty-note">Apply for an opportunity to see its status here.</p>}</section>}
    {canPost && applications.length > 0 && <section className="dash-card application-card"><h3>Applications for your opportunities</h3>{applications.map((application) => <div className="mini-row" key={application._id}><div><b>{application.applicant?.name} · {application.job?.title}</b><small>{application.applicant?.email} · {application.job?.company}</small></div><span className={`status-pill status-${application.status}`}>{application.status}</span><div className="table-actions"><button onClick={() => action(`/applications/${application._id}`, { status: "accepted" }, "patch")}>Accept</button><button onClick={() => action(`/applications/${application._id}`, { status: "rejected" }, "patch")}>Decline</button></div></div>)}</section>}
  </>;
}

function InternalApply({ job, action }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button className="button button-primary button-small" onClick={() => setOpen(true)}>Apply in portal</button>;
  return <form className="apply-form" onSubmit={(event) => {
    event.preventDefault();
    const message = new FormData(event.currentTarget).get("message");
    setOpen(false);
    action(`/jobs/${job._id}/apply`, { message });
  }}>
    <label>Short note to the employer<textarea name="message" rows="2" maxLength="2000" placeholder="Share why this opportunity interests you." /></label>
    <button className="button button-primary button-small">Send application</button>
    <button className="text-button" type="button" onClick={() => setOpen(false)}>Cancel</button>
  </form>;
}

function EventSection({ user, events, action, submitForm }) {
  const canCreate = ["faculty", "hod", "admin"].includes(user.role);
  const [participants, setParticipants] = useState(null);
  const [participantsError, setParticipantsError] = useState("");
  async function showParticipants(eventId) {
    setParticipantsError("");
    try {
      const { data } = await api.get(`/events/${eventId}/participants`);
      setParticipants(data);
    } catch (requestError) {
      setParticipantsError(getErrorMessage(requestError));
    }
  }
  return <>
    <div className="section-lead"><div><span className="eyebrow eyebrow-blue">SAVE A SEAT FOR YOURSELF</span><h2>Community events</h2><p>Meet, learn, and celebrate with your college community.</p></div></div>
    {canCreate && <details className="form-disclosure"><summary>+ Create an event</summary><form className="compact-form" onSubmit={(event) => submitForm(event, "/events", "post")}>
      <Field label="Event title" name="title" required /><SelectField label="Event type" name="type" options={[["alumni-meet", "Alumni meet"], ["workshop", "Workshop"], ["guest-lecture", "Guest lecture"], ["webinar", "Webinar"], ["placement-drive", "Placement drive"], ["reunion", "Reunion"], ["other", "Other"]]} /><Field label="Date & time" name="date" type="datetime-local" required /><Field label="Location or meeting link" name="location" required /><TextArea label="About this event" name="description" required /><button className="button button-primary">Publish event</button>
    </form></details>}
    <div className="event-list">{events.map((event) => <article className="event-card" key={event._id}><time className="event-date" dateTime={event.date}><b>{new Date(event.date).getDate()}</b><span>{new Date(event.date).toLocaleString("en", { month: "short" }).toUpperCase()}</span></time><div className="event-info"><span className="story-tag">{event.type.replaceAll("-", " ").toUpperCase()}</span><h3>{event.title}</h3><p>{event.description}</p><small>{new Date(event.date).toLocaleString()} · {event.location}</small></div><button className="button button-primary button-small" onClick={() => action(`/events/${event._id}/register`, {})}>Register</button>{canCreate && <button className="text-button" onClick={() => showParticipants(event._id)}>Participants</button>}{(["admin", "hod"].includes(user.role) || event.createdBy?._id === user._id) && <button className="text-button text-danger" onClick={() => action(`/events/${event._id}`, {}, "delete")}>Delete event</button>}</article>)}</div>
    <Message error={participantsError} />
    {participants && <section className="dash-card participant-panel"><div className="dash-card-heading"><h3>Event participants</h3><button className="text-button" onClick={() => setParticipants(null)}>Close</button></div>{participants.length ? participants.map((registration) => <div className="mini-row" key={registration._id}><div><b>{registration.user?.name}</b><small>{registration.user?.email} · {registration.user?.role}</small></div></div>) : <p className="empty-note">No registrations yet.</p>}</section>}
    {!events.length && <p className="empty-note">No upcoming events have been posted.</p>}
  </>;
}

function AnnouncementSection({ user, items, action, submitForm }) {
  const canPost = ["faculty", "hod", "admin"].includes(user.role);
  return <>
    <div className="section-lead"><div><span className="eyebrow eyebrow-blue">IMPORTANT NOTES FROM YOUR COLLEGE</span><h2>Announcements</h2><p>Updates and news relevant to your community.</p></div></div>
    {canPost && <details className="form-disclosure"><summary>+ Publish an announcement</summary><form className="compact-form" onSubmit={(event) => submitForm(event, "/announcements", "post")}>
      <Field label="Announcement title" name="title" required /><SelectField label="Who should see this?" name="audience" options={[["all", "Everyone"], ["students", "Students"], ["alumni", "Alumni"], ["department", "Department"]]} /><TextArea label="Announcement" name="body" required /><button className="button button-primary">Publish announcement</button>
    </form></details>}
    <div className="announcement-list">{items.map((item) => <article className="announcement-card" key={item._id}><span className="announcement-icon">↗</span><div><span className="story-tag">{item.audience} · {dateLabel(item.createdAt)}</span><h3>{item.title}</h3><p>{item.body}</p><small>Posted by {item.author?.name || "College community"}</small></div>{(user.role === "admin" || user.role === "hod" || item.author?._id === user._id) && <button className="text-button text-danger" onClick={() => action(`/announcements/${item._id}`, {}, "delete")}>Delete</button>}</article>)}</div>
    {!items.length && <p className="empty-note">No announcements yet.</p>}
  </>;
}

function PeopleSection({ user, users, action }) {
  const list = user.role === "hod" ? users : users.filter((person) => ["student", "alumni"].includes(person.role));
  return <>
    <div className="section-lead"><div><span className="eyebrow eyebrow-blue">YOUR DEPARTMENT COMMUNITY</span><h2>{user.role === "alumni" ? "Connect with students" : "Students & alumni"}</h2><p>{user.role === "alumni" ? "Meet current students and share the experience you've gained." : "Browse people connected to your college community."}</p></div><span className="count-pill">{list.length} people</span></div>
    <div className="table-wrap"><table><thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Course</th><th>Graduation year</th><th>Status</th>{["hod", "alumni"].includes(user.role) && <th>Action</th>}</tr></thead><tbody>{list.map((person) => <tr key={person._id}><td><div className="table-person"><span className="table-avatar">{initials(person.name)}</span>{person.name}</div></td><td className="capitalize">{person.role}</td><td>{person.department?.name || "—"}</td><td>{person.course || "—"}</td><td>{person.graduationYear || "—"}</td><td><span className={`status-pill status-${person.status}`}>{person.status}</span></td>{["hod", "alumni"].includes(user.role) && <td>{user.role === "hod" && person.role === "faculty" ? <button className="text-button text-danger" onClick={() => action(`/users/${person._id}`, {}, "delete")}>Remove faculty</button> : user.role === "alumni" ? <button className="text-button" onClick={() => action("/connections", { recipient: person._id })}>Connect</button> : "—"}</td>}</tr>)}</tbody></table></div>
    {!list.length && <p className="empty-note">No people to display yet.</p>}
  </>;
}

function ManagementSection({ user, data, action, submitForm }) {
  function downloadReport() {
    const header = ["Department", "Students", "Alumni", "Faculty", "Opportunities", "Upcoming events"];
    const lines = data.reports.map((row) => [row.department, row.students, row.alumni, row.faculty, row.opportunities, row.upcomingEvents]);
    const csv = [header, ...lines].map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = "alumni-connect-department-report.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }
  return <>
    <div className="section-lead"><div><span className="eyebrow eyebrow-blue">KEEPING YOUR COMMUNITY THRIVING</span><h2>{user.role === "admin" ? "Administration" : "Department management"}</h2><p>{user.role === "admin" ? "Manage members, roles, and the departments that make up your college." : "Review alumni registrations and keep an eye on your department."}</p></div></div>
    <div className="management-grid">
      <section className="dash-card manage-panel"><div className="dash-card-heading"><div><span className="eyebrow eyebrow-blue">REVIEW REQUIRED</span><h3>Alumni approvals</h3></div><span className="count-pill">{data.pending.length} pending</span></div>
        {data.pending.map((person) => <div className="pending-row" key={person._id}><div><b>{person.name}</b><small>{person.email} · {person.department?.name || "Department not set"}</small></div><div className="table-actions"><button onClick={() => action(`/admin/users/${person._id}/approval`, { status: "approved" }, "patch")}>Approve</button><button className="text-danger" onClick={() => action(`/admin/users/${person._id}/approval`, { status: "rejected" }, "patch")}>Reject</button></div></div>)}
        {!data.pending.length && <p className="empty-note">No pending alumni registrations.</p>}
      </section>
      {user.role === "admin" && <>
        <section className="dash-card manage-panel"><span className="eyebrow eyebrow-blue">AUTHORIZED ACCESS</span><h3>Create a staff account</h3><form className="compact-form" onSubmit={(event) => submitForm(event, "/admin/accounts")}><Field label="Full name" name="name" required /><Field label="Email address" name="email" type="email" required /><Field label="Temporary password (8+ characters)" name="password" type="password" required minLength="8" /><SelectField label="Role" name="role" options={[["faculty", "Faculty"], ["hod", "HOD"], ["admin", "Administrator"]]} /><DepartmentSelect departments={data.departments} /><button className="button button-primary">Create account</button></form></section>
        <section className="dash-card manage-panel"><span className="eyebrow eyebrow-blue">BUILD YOUR COLLEGE DIRECTORY</span><h3>Add a department</h3><form className="compact-form" onSubmit={(event) => submitForm(event, "/admin/departments")}><Field label="Department name" name="name" required /><Field label="Short code" name="code" required placeholder="e.g. CSE" /><TextArea label="Description (optional)" name="description" /><button className="button button-primary">Add department</button></form>
          {data.departments.map((department) => <div className="department-row" key={department._id}><div><b>{department.name}</b><small>{department.code}</small></div><div className="table-actions"><button onClick={() => { const name = window.prompt("Department name", department.name); if (!name?.trim()) return; const code = window.prompt("Department code", department.code); if (code?.trim()) action(`/admin/departments/${department._id}`, { name: name.trim(), code: code.trim() }, "patch"); }}>Edit</button><button className="text-danger" onClick={() => action(`/admin/departments/${department._id}`, {}, "delete")}>Remove</button></div></div>)}
        </section>
        <section className="dash-card manage-panel department-report"><span className="eyebrow eyebrow-blue">A CLOSER LOOK</span><h3>Department community</h3><div className="table-wrap"><table><thead><tr><th>Department</th><th>Students</th><th>Alumni</th><th>Faculty</th></tr></thead><tbody>{data.stats?.departmentStats.map(({ department, students, alumni, faculty }) => <tr key={department._id}><td>{department.name}</td><td>{students}</td><td>{alumni}</td><td>{faculty}</td></tr>)}</tbody></table></div></section>
        <section className="dash-card manage-panel department-report"><div className="dash-card-heading"><div><span className="eyebrow eyebrow-blue">PLATFORM ACTIVITY</span><h3>Recent activity</h3></div></div>{data.activities.map((item, index) => <div className="pending-row" key={`${item.kind}-${item.date}-${index}`}><div><b>{item.label}</b><small>{item.kind} · {item.actor || item.status || "community"} · {dateLabel(item.date)}</small></div></div>)}</section>
        <section className="dash-card manage-panel department-report"><div className="dash-card-heading"><div><span className="eyebrow eyebrow-blue">EXPORTABLE SUMMARY</span><h3>Department report</h3></div><button className="button button-outline button-small" onClick={downloadReport}>Download CSV</button></div><div className="table-wrap"><table><thead><tr><th>Department</th><th>Students</th><th>Alumni</th><th>Faculty</th><th>Opportunities</th><th>Upcoming events</th></tr></thead><tbody>{data.reports.map((row) => <tr key={row.department}><td>{row.department}</td><td>{row.students}</td><td>{row.alumni}</td><td>{row.faculty}</td><td>{row.opportunities}</td><td>{row.upcomingEvents}</td></tr>)}</tbody></table></div></section>
        <section className="dash-card manage-panel department-report"><div className="dash-card-heading"><div><span className="eyebrow eyebrow-blue">USER ACCESS</span><h3>Manage accounts</h3></div></div><div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Action</th></tr></thead><tbody>{data.users.map((person) => <tr key={person._id}><td>{person.name}</td><td>{person.email}</td><td className="capitalize">{person.role}</td><td>{person.department?.name || "—"}</td><td>{person.role !== "admin" && <button className="text-button text-danger" onClick={() => action(`/users/${person._id}`, {}, "delete")}>Remove</button>}</td></tr>)}</tbody></table></div></section>
      </>}
      {user.role === "hod" && <section className="dash-card manage-panel"><div className="dash-card-heading"><div><span className="eyebrow eyebrow-blue">DEPARTMENT SUMMARY</span><h3>Placement & participation</h3></div><button className="button button-outline button-small" onClick={downloadReport}>Download CSV</button></div><div className="table-wrap"><table><thead><tr><th>Department</th><th>Students</th><th>Alumni</th><th>Faculty</th><th>Opportunities</th><th>Upcoming events</th></tr></thead><tbody>{data.reports.map((row) => <tr key={row.department}><td>{row.department}</td><td>{row.students}</td><td>{row.alumni}</td><td>{row.faculty}</td><td>{row.opportunities}</td><td>{row.upcomingEvents}</td></tr>)}</tbody></table></div></section>}
    </div>
  </>;
}

function DepartmentSelect({ departments, selected = "" }) {
  return <label>Department<select name="department" defaultValue={selected}><option value="">Not assigned</option>{departments.map((department) => <option value={department._id} key={department._id}>{department.name}</option>)}</select></label>;
}

function ProfileSection({ user, profile, departments, submitForm }) {
  return <>
    <div className="section-lead"><div><span className="eyebrow eyebrow-blue">MAKE YOUR PROFILE YOURS</span><h2>My profile</h2><p>Keep your community profile current so the right people can find you.</p></div></div>
    <section className="dash-card profile-edit-card"><div className="profile-edit-intro"><div className="profile-avatar profile-avatar-large">{initials(user.name)}</div><div><h3>{user.name}</h3><p>{user.email} · <span className="capitalize">{user.role}</span></p></div></div>
      <p className="profile-department">Department: <b>{departments.find((department) => String(department._id) === String(user.department?._id || user.department))?.name || "Not assigned"}</b></p>
      <form className="compact-form profile-form" onSubmit={(event) => submitForm(event, "/users/me", "patch", (values) => ({
        ...values,
        graduationYear: values.graduationYear ? Number(values.graduationYear) : undefined,
        experience: values.experience ? Number(values.experience) : undefined,
        skills: values.skills ? values.skills.split(",").map((skill) => skill.trim()).filter(Boolean) : [],
        achievements: values.achievements ? values.achievements.split(",").map((value) => value.trim()).filter(Boolean) : [],
        availableForMentorship: values.availableForMentorship === "on"
      }))}>
        <Field label="Full name" name="name" required defaultValue={user.name} /><Field label="Phone number" name="phone" defaultValue={user.phone || ""} />
        <Field label="Course" name="course" defaultValue={user.course || ""} />
        <Field label="Graduation year" name="graduationYear" type="number" min="1950" max="2100" defaultValue={user.graduationYear || ""} />
        <Field label="Enrollment number" name="enrollmentNumber" defaultValue={user.enrollmentNumber || ""} />
        {(user.role === "alumni" || user.role === "student") && <>
          <Field label="Skills (comma separated)" name="skills" defaultValue={(profile.skills || []).join(", ")} />
          <Field label="Profile image URL" name="profileImage" type="url" defaultValue={profile.profileImage || ""} />
          <TextArea label="Short bio" name="bio" defaultValue={profile.bio || ""} />
        </>}
        {user.role === "alumni" && <>
          <Field label="Company" name="company" defaultValue={profile.company || ""} /><Field label="Job designation" name="designation" defaultValue={profile.designation || ""} />
          <Field label="Years of experience" name="experience" type="number" min="0" max="80" defaultValue={profile.experience ?? ""} />
          <Field label="Achievements (comma separated)" name="achievements" defaultValue={(profile.achievements || []).join(", ")} />
          <label className="checkbox-field"><input name="availableForMentorship" type="checkbox" defaultChecked={profile.availableForMentorship} /> I’m available to mentor students</label>
        </>}
        {(user.role === "faculty" || user.role === "hod") && <Field label="Designation" name="designation" defaultValue={profile.designation || ""} />}
        <button className="button button-primary">Save profile</button>
      </form>
    </section>
  </>;
}
