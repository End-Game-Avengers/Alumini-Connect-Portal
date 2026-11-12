const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Department = require("../models/Department");
const StudentProfile = require("../models/StudentProfile");
const AlumniProfile = require("../models/AlumniProfile");
const FacultyProfile = require("../models/FacultyProfile");
const Connection = require("../models/Connection");
const Mentorship = require("../models/Mentorship");
const Job = require("../models/Job");
const Application = require("../models/Application");
const Event = require("../models/Event");
const EventRegistration = require("../models/EventRegistration");
const Announcement = require("../models/Announcement");
const Notification = require("../models/Notification");
const Resource = require("../models/Resource");
const { requireAuth, allowRoles } = require("../middleware/auth");
const notify = require("../utils/notify");

const router = express.Router();
router.use(requireAuth);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const profileForRole = { student: StudentProfile, alumni: AlumniProfile, faculty: FacultyProfile, hod: FacultyProfile };
const publicUserFields = "name role department course graduationYear status createdAt";
const staffUserFields = `${publicUserFields} email phone enrollmentNumber`;
const scopedDepartment = (user) => ["hod", "faculty"].includes(user.role) ? { department: user.department } : {};
const safeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

router.get("/departments", async (req, res, next) => {
  try {
    res.json(await Department.find().sort({ name: 1 }));
  } catch (error) { next(error); }
});

router.get("/users", allowRoles("admin", "hod", "faculty"), async (req, res, next) => {
  try {
    const query = { ...scopedDepartment(req.user) };
    if (req.query.role) query.role = req.query.role;
    if (req.query.status && req.user.role !== "faculty") query.status = req.query.status;
    if (req.user.role === "faculty") query.status = "approved";
    if (req.query.search) query.name = { $regex: String(req.query.search).trim(), $options: "i" };
    res.json(await User.find(query).select(staffUserFields).populate("department", "name code").sort({ name: 1 }).limit(500));
  } catch (error) { next(error); }
});

router.get("/students", allowRoles("alumni", "admin"), async (req, res, next) => {
  try {
    const query = { role: "student", status: "approved" };
    if (req.query.department) query.department = req.query.department;
    if (req.query.search) query.name = { $regex: safeRegex(String(req.query.search).trim()), $options: "i" };
    res.json(await User.find(query).select(publicUserFields).populate("department", "name code").sort({ name: 1 }).limit(200));
  } catch (error) { next(error); }
});

router.get("/users/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(publicUserFields).populate("department", "name code");
    if (!user || (user.status !== "approved" && !["admin", "hod"].includes(req.user.role)) ||
      (["hod", "faculty"].includes(req.user.role) && String(user.department?._id || user.department) !== String(req.user.department))) {
      return res.status(404).json({ message: "User not found" });
    }
    const Profile = profileForRole[user.role];
    const profile = Profile ? await Profile.findOne({ user: user._id }) : {};
    res.json({ user, profile: profile || {} });
  } catch (error) { next(error); }
});

router.patch("/users/me", async (req, res, next) => {
  try {
    const allowed = ["name", "phone", "course", "graduationYear", "enrollmentNumber"];
    allowed.forEach((key) => { if (req.body[key] !== undefined) req.user[key] = req.body[key]; });
    await req.user.save();
    const Profile = profileForRole[req.user.role];
    let profile = {};
    if (Profile) {
      const profileFields = req.user.role === "alumni"
        ? ["bio", "company", "designation", "skills", "experience", "profileImage", "availableForMentorship", "achievements"]
        : ["bio", "skills", "profileImage", "designation"];
      const updates = {};
      profileFields.forEach((key) => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });
      profile = await Profile.findOneAndUpdate({ user: req.user._id }, { $set: updates }, { new: true, upsert: true, runValidators: true });
    }
    res.json({ user: req.user, profile });
  } catch (error) { next(error); }
});

router.delete("/users/:id", allowRoles("admin", "hod"), async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.id, ...scopedDepartment(req.user) });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") return res.status(403).json({ message: "Administrator accounts cannot be deleted here" });
    if (req.user.role === "hod" && user.role === "hod") return res.status(403).json({ message: "HOD accounts can only be managed by an administrator" });
    const [jobIds, eventIds] = await Promise.all([
      Job.find({ postedBy: user._id }).distinct("_id"),
      Event.find({ createdBy: user._id }).distinct("_id")
    ]);
    await Promise.all([
      User.deleteOne({ _id: user._id }),
      StudentProfile.deleteOne({ user: user._id }),
      AlumniProfile.deleteOne({ user: user._id }),
      FacultyProfile.deleteOne({ user: user._id }),
      Connection.deleteMany({ $or: [{ requester: user._id }, { recipient: user._id }] }),
      Mentorship.deleteMany({ $or: [{ student: user._id }, { alumni: user._id }] }),
      Application.deleteMany({ $or: [{ applicant: user._id }, { job: { $in: jobIds } }] }),
      Job.deleteMany({ postedBy: user._id }),
      EventRegistration.deleteMany({ $or: [{ user: user._id }, { event: { $in: eventIds } }] }),
      Event.deleteMany({ createdBy: user._id }),
      Announcement.deleteMany({ author: user._id }),
      Resource.deleteMany({ author: user._id }),
      Notification.deleteMany({ recipient: user._id })
    ]);
    res.json({ message: "User deleted" });
  } catch (error) { next(error); }
});

router.get("/alumni", async (req, res, next) => {
  try {
    const query = { role: "alumni", status: "approved", ...scopedDepartment(req.user) };
    if (req.query.department) {
      if (["hod", "faculty"].includes(req.user.role) && String(req.query.department) !== String(req.user.department)) {
        return res.status(403).json({ message: "You can only search alumni in your department" });
      }
      query.department = req.query.department;
    }
    if (req.query.year) query.graduationYear = Number(req.query.year);
    if (req.query.search) query.name = { $regex: safeRegex(String(req.query.search).trim()), $options: "i" };
    if (req.query.company) {
      const usersWithCompany = await AlumniProfile.find({ company: { $regex: safeRegex(String(req.query.company).trim()), $options: "i" } }).distinct("user");
      query._id = { $in: usersWithCompany };
    }
    const users = await User.find(query).select(publicUserFields).populate("department", "name code").sort({ name: 1 }).limit(200);
    const profiles = await AlumniProfile.find({ user: { $in: users.map((user) => user._id) } });
    const byUser = new Map(profiles.map((profile) => [String(profile.user), profile]));
    res.json(users.map((user) => ({ user, profile: byUser.get(String(user._id)) || {} })));
  } catch (error) { next(error); }
});

router.post("/connections", allowRoles("student", "alumni"), async (req, res, next) => {
  try {
    if (String(req.body.recipient) === String(req.user._id)) return res.status(400).json({ message: "You cannot connect with yourself" });
    const recipient = await User.findOne({ _id: req.body.recipient, status: "approved" });
    if (!recipient) return res.status(404).json({ message: "Account not found" });
    if (await Connection.exists({ requester: recipient._id, recipient: req.user._id, status: { $in: ["pending", "accepted"] } })) {
      return res.status(409).json({ message: "This person has already sent you a connection request" });
    }
    const connection = await Connection.create({ requester: req.user._id, recipient: recipient._id });
    await notify(recipient._id, `${req.user.name} sent you a connection request`, "/dashboard");
    res.status(201).json(connection);
  } catch (error) { next(error); }
});

router.get("/connections", async (req, res, next) => {
  try {
    res.json(await Connection.find({ $or: [{ requester: req.user._id }, { recipient: req.user._id }] })
      .populate("requester", "name role department").populate("recipient", "name role department").sort({ createdAt: -1 }));
  } catch (error) { next(error); }
});

router.patch("/connections/:id", async (req, res, next) => {
  try {
    if (!["accepted", "rejected"].includes(req.body.status)) return res.status(400).json({ message: "Choose accepted or rejected" });
    const connection = await Connection.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id, status: "pending" },
      { status: req.body.status },
      { new: true }
    );
    if (!connection) return res.status(404).json({ message: "Pending request not found" });
    await notify(connection.requester, `Your connection request was ${req.body.status}`, "/dashboard");
    res.json(connection);
  } catch (error) { next(error); }
});

router.get("/mentors", async (req, res, next) => {
  try {
    const profiles = await AlumniProfile.find({ availableForMentorship: true }).populate({
      path: "user", match: { status: "approved" }, select: publicUserFields, populate: { path: "department", select: "name code" }
    });
    res.json(profiles.filter((profile) => profile.user));
  } catch (error) { next(error); }
});

router.post("/mentorship", allowRoles("student"), async (req, res, next) => {
  try {
    const mentor = await User.findOne({ _id: req.body.alumni, role: "alumni", status: "approved" });
    const available = mentor && await AlumniProfile.exists({ user: mentor._id, availableForMentorship: true });
    if (!available) return res.status(404).json({ message: "Available mentor not found" });
    const request = await Mentorship.findOneAndUpdate(
      { student: req.user._id, alumni: mentor._id, status: "rejected" },
      { status: "pending", message: req.body.message },
      { new: true }
    ) || await Mentorship.create({ student: req.user._id, alumni: mentor._id, message: req.body.message });
    await notify(mentor._id, `${req.user.name} requested mentorship`, "/dashboard");
    res.status(201).json(request);
  } catch (error) { next(error); }
});

router.get("/mentorship", async (req, res, next) => {
  try {
    const filter = req.user.role === "student" ? { student: req.user._id }
      : req.user.role === "alumni" ? { alumni: req.user._id }
        : ["hod", "faculty"].includes(req.user.role) ? { student: { $in: await User.find(scopedDepartment(req.user)).distinct("_id") } } : {};
    res.json(await Mentorship.find(filter).populate("student", "name department").populate("alumni", "name department").sort({ createdAt: -1 }));
  } catch (error) { next(error); }
});

router.patch("/mentorship/:id", allowRoles("alumni"), async (req, res, next) => {
  try {
    if (!["accepted", "rejected"].includes(req.body.status)) return res.status(400).json({ message: "Choose accepted or rejected" });
    const request = await Mentorship.findOneAndUpdate(
      { _id: req.params.id, alumni: req.user._id, status: "pending" },
      { status: req.body.status }, { new: true }
    );
    if (!request) return res.status(404).json({ message: "Pending mentorship request not found" });
    await notify(request.student, `Your mentorship request was ${req.body.status}`, "/dashboard");
    res.json(request);
  } catch (error) { next(error); }
});

router.get("/jobs", async (req, res, next) => {
  try {
    const query = { active: true };
    if (req.query.type) query.type = req.query.type;
    if (req.query.search) {
      const text = String(req.query.search).trim();
      query.$or = [{ title: { $regex: text, $options: "i" } }, { company: { $regex: text, $options: "i" } }];
    }
    res.json(await Job.find(query).populate("postedBy", "name role").sort({ createdAt: -1 }).limit(200));
  } catch (error) { next(error); }
});

router.post("/jobs", allowRoles("alumni", "faculty", "hod", "admin"), async (req, res, next) => {
  try {
    const { title, type, company, description } = req.body;
    if (!title || !["job", "internship"].includes(type) || !company || !description) {
      return res.status(400).json({ message: "Title, type, company, and description are required" });
    }
    if (req.body.applicationDeadline && new Date(req.body.applicationDeadline) < new Date()) {
      return res.status(400).json({ message: "Application deadline must be in the future" });
    }
    const job = await Job.create({ ...req.body, postedBy: req.user._id, department: req.user.department });
    res.status(201).json(job);
  } catch (error) { next(error); }
});

router.patch("/jobs/:id", async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, ...scopedDepartment(req.user) });
    if (!job) return res.status(404).json({ message: "Opportunity not found" });
    if (req.user.role !== "admin" && String(job.postedBy) !== String(req.user._id) && req.user.role !== "hod") {
      return res.status(403).json({ message: "Only the author or an administrator can edit this opportunity" });
    }
    const fields = ["title", "type", "company", "description", "skills", "eligibility", "location", "compensation", "applicationDeadline", "applicationLink", "active"];
    fields.forEach((key) => { if (req.body[key] !== undefined) job[key] = req.body[key]; });
    await job.save();
    res.json(job);
  } catch (error) { next(error); }
});

router.delete("/jobs/:id", allowRoles("alumni", "faculty", "hod", "admin"), async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, ...scopedDepartment(req.user) });
    if (!job) return res.status(404).json({ message: "Opportunity not found" });
    if (req.user.role !== "admin" && String(job.postedBy) !== String(req.user._id) && req.user.role !== "hod") {
      return res.status(403).json({ message: "Only the author or an administrator can delete this opportunity" });
    }
    await Promise.all([
      job.deleteOne(),
      Application.deleteMany({ job: job._id })
    ]);
    res.json({ message: "Opportunity deleted" });
  } catch (error) { next(error); }
});

router.post("/jobs/:id/apply", allowRoles("student"), async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, active: true });
    if (!job) return res.status(404).json({ message: "Opportunity not found" });
    if (job.applicationDeadline && job.applicationDeadline < new Date()) return res.status(400).json({ message: "The application deadline has passed" });
    const application = await Application.create({ job: job._id, applicant: req.user._id, message: req.body.message });
    await notify(job.postedBy, `${req.user.name} applied for ${job.title}`, "/dashboard");
    res.status(201).json(application);
  } catch (error) { next(error); }
});

router.get("/applications", async (req, res, next) => {
  try {
    const filter = req.user.role === "student" ? { applicant: req.user._id } : {};
    if (req.user.role !== "student") {
      const jobQuery = { ...scopedDepartment(req.user) };
      if (!["admin", "hod"].includes(req.user.role)) jobQuery.postedBy = req.user._id;
      filter.job = { $in: await Job.find(jobQuery).distinct("_id") };
    }
    res.json(await Application.find(filter).populate("job").populate("applicant", "name email department").sort({ createdAt: -1 }));
  } catch (error) { next(error); }
});

router.get("/events", async (req, res, next) => {
  try {
    const eventFilter = { date: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } };
    if (req.user.role !== "admin") {
      eventFilter.$or = req.user.department
        ? [{ department: req.user.department }, { department: null }]
        : [{ department: null }];
    }
    const events = await Event.find(eventFilter)
      .populate("createdBy", "name role").sort({ date: 1 }).limit(200);
    res.json(events);
  } catch (error) { next(error); }
});

router.post("/events", allowRoles("faculty", "hod", "admin"), async (req, res, next) => {
  try {
    if (!req.body.title || !req.body.description || !req.body.date || !req.body.location) {
      return res.status(400).json({ message: "Title, description, date, and location are required" });
    }
    if (new Date(req.body.date) <= new Date()) return res.status(400).json({ message: "Event date must be in the future" });
    const event = await Event.create({ ...req.body, createdBy: req.user._id, department: req.user.department });
    res.status(201).json(event);
  } catch (error) { next(error); }
});

router.delete("/events/:id", allowRoles("faculty", "hod", "admin"), async (req, res, next) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, ...scopedDepartment(req.user) });
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (req.user.role === "faculty" && String(event.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only remove events you created" });
    }
    await Promise.all([
      event.deleteOne(),
      EventRegistration.deleteMany({ event: event._id })
    ]);
    res.json({ message: "Event deleted" });
  } catch (error) { next(error); }
});

router.post("/events/:id/register", async (req, res, next) => {
  try {
    if (!(await Event.exists({ _id: req.params.id }))) return res.status(404).json({ message: "Event not found" });
    const registration = await EventRegistration.create({ event: req.params.id, user: req.user._id });
    res.status(201).json(registration);
  } catch (error) { next(error); }
});

router.get("/events/:id/participants", allowRoles("faculty", "hod", "admin"), async (req, res, next) => {
  try {
    if (!(await Event.exists({ _id: req.params.id, ...scopedDepartment(req.user) }))) {
      return res.status(404).json({ message: "Event not found in your department" });
    }
    const registrations = await EventRegistration.find({ event: req.params.id }).populate("user", "name email role department");
    res.json(registrations);
  } catch (error) { next(error); }
});

router.get("/announcements", async (req, res, next) => {
  try {
    const audience = req.user.role === "student" ? ["all", "students"]
      : req.user.role === "alumni" ? ["all", "alumni"] : null;
    const filter = {};
    if (req.user.role !== "admin") {
      const visibleAnnouncements = audience
        ? [{ audience: { $in: audience } }, ...(req.user.department ? [{ audience: "department", department: req.user.department }] : [])]
        : req.user.department ? [{ department: req.user.department }, { department: null }] : [{ department: null }];
      filter.$or = visibleAnnouncements;
    }
    res.json(await Announcement.find(filter).populate("author", "name role").sort({ createdAt: -1 }).limit(100));
  } catch (error) { next(error); }
});

router.post("/announcements", allowRoles("faculty", "hod", "admin"), async (req, res, next) => {
  try {
    if (!req.body.title || !req.body.body) return res.status(400).json({ message: "Title and announcement text are required" });
    const announcement = await Announcement.create({
      ...req.body,
      audience: req.user.role === "hod" ? "department" : req.body.audience,
      author: req.user._id,
      department: req.user.department
    });
    res.status(201).json(announcement);
  } catch (error) { next(error); }
});

router.delete("/announcements/:id", allowRoles("faculty", "hod", "admin"), async (req, res, next) => {
  try {
    const announcement = await Announcement.findOne({ _id: req.params.id, ...scopedDepartment(req.user) });
    if (!announcement) return res.status(404).json({ message: "Announcement not found" });
    if (req.user.role === "faculty" && String(announcement.author) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only remove your own announcements" });
    }
    await announcement.deleteOne();
    res.json({ message: "Announcement deleted" });
  } catch (error) { next(error); }
});

router.get("/notifications", async (req, res, next) => {
  try { res.json(await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(100)); }
  catch (error) { next(error); }
});

router.get("/resources", async (req, res, next) => {
  try {
    const filter = req.user.role === "admin" ? {}
      : req.user.department ? { $or: [{ department: req.user.department }, { department: null }] }
        : { department: null };
    res.json(await Resource.find(filter).populate("author", "name role").sort({ createdAt: -1 }).limit(100));
  } catch (error) { next(error); }
});

router.post("/resources", allowRoles("faculty", "hod", "admin"), async (req, res, next) => {
  try {
    if (!req.body.title || !req.body.url) return res.status(400).json({ message: "Resource title and link are required" });
    if (!/^https?:\/\//i.test(req.body.url)) return res.status(400).json({ message: "Resource links must start with http:// or https://" });
    res.status(201).json(await Resource.create({
      title: req.body.title, description: req.body.description, url: req.body.url, type: req.body.type,
      author: req.user._id, department: req.user.department
    }));
  } catch (error) { next(error); }
});

router.delete("/resources/:id", allowRoles("faculty", "hod", "admin"), async (req, res, next) => {
  try {
    const resource = await Resource.findOne({ _id: req.params.id, ...scopedDepartment(req.user) });
    if (!resource) return res.status(404).json({ message: "Resource not found" });
    if (req.user.role === "faculty" && String(resource.author) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only remove resources you shared" });
    }
    await resource.deleteOne();
    res.json({ message: "Resource removed" });
  } catch (error) { next(error); }
});

router.patch("/applications/:id", allowRoles("alumni", "faculty", "hod", "admin"), async (req, res, next) => {
  try {
    if (!["reviewing", "accepted", "rejected"].includes(req.body.status)) {
      return res.status(400).json({ message: "Choose reviewing, accepted, or rejected" });
    }
    const application = await Application.findById(req.params.id).populate("job");
    if (!application) return res.status(404).json({ message: "Application not found" });
    if (req.user.role !== "admin" && String(application.job.postedBy) !== String(req.user._id) &&
      !(req.user.role === "hod" && String(application.job.department) === String(req.user.department))) {
      return res.status(403).json({ message: "Only the opportunity author or department HOD can review applications" });
    }
    application.status = req.body.status;
    await application.save();
    res.json(application);
  } catch (error) { next(error); }
});

router.patch("/notifications/read-all", async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
    res.json({ message: "Notifications marked as read" });
  } catch (error) { next(error); }
});

router.get("/admin/stats", allowRoles("admin", "hod"), async (req, res, next) => {
  try {
    const scope = scopedDepartment(req.user);
    const counts = await Promise.all([
      User.countDocuments({ ...scope, role: "student", status: "approved" }),
      User.countDocuments({ ...scope, role: "alumni", status: "approved" }),
      User.countDocuments({ ...scope, role: "faculty", status: "approved" }),
      User.countDocuments({ ...scope, role: "hod", status: "approved" }),
      User.countDocuments({ ...scope, role: "alumni", status: "pending" }),
      Job.countDocuments({ ...scope, active: true }),
      Event.countDocuments({ ...scope, date: { $gte: new Date() } })
    ]);
    const departments = await Department.find(req.user.role === "hod" ? { _id: req.user.department } : {}).sort({ name: 1 });
    const departmentStats = await Promise.all(departments.map(async (department) => ({
      department,
      students: await User.countDocuments({ department: department._id, role: "student", status: "approved" }),
      alumni: await User.countDocuments({ department: department._id, role: "alumni", status: "approved" }),
      faculty: await User.countDocuments({ department: department._id, role: "faculty", status: "approved" })
    })));
    res.json({
      students: counts[0], alumni: counts[1], faculty: counts[2], hods: counts[3],
      pendingRegistrations: counts[4], jobs: counts[5], events: counts[6], departmentStats
    });
  } catch (error) { next(error); }
});

router.get("/admin/activity", allowRoles("admin"), async (req, res, next) => {
  try {
    const [users, jobs, events, announcements] = await Promise.all([
      User.find().select("name role status createdAt").sort({ createdAt: -1 }).limit(8),
      Job.find().select("title company createdAt").populate("postedBy", "name").sort({ createdAt: -1 }).limit(8),
      Event.find().select("title date createdAt").populate("createdBy", "name").sort({ createdAt: -1 }).limit(8),
      Announcement.find().select("title createdAt").populate("author", "name").sort({ createdAt: -1 }).limit(8)
    ]);
    const activities = [
      ...users.map((item) => ({ kind: "account", label: `${item.name} registered as ${item.role}`, status: item.status, date: item.createdAt })),
      ...jobs.map((item) => ({ kind: "opportunity", label: `${item.title} at ${item.company}`, actor: item.postedBy?.name, date: item.createdAt })),
      ...events.map((item) => ({ kind: "event", label: item.title, actor: item.createdBy?.name, date: item.createdAt })),
      ...announcements.map((item) => ({ kind: "announcement", label: item.title, actor: item.author?.name, date: item.createdAt }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);
    res.json(activities);
  } catch (error) { next(error); }
});

router.get("/admin/reports", allowRoles("admin", "hod"), async (req, res, next) => {
  try {
    const scope = scopedDepartment(req.user);
    const departments = await Department.find(req.user.role === "hod" ? { _id: req.user.department } : {}).sort({ name: 1 });
    const report = await Promise.all(departments.map(async (department) => ({
      department: department.name,
      students: await User.countDocuments({ department: department._id, role: "student", status: "approved" }),
      alumni: await User.countDocuments({ department: department._id, role: "alumni", status: "approved" }),
      faculty: await User.countDocuments({ department: department._id, role: "faculty", status: "approved" }),
      opportunities: await Job.countDocuments({ ...scope, department: department._id }),
      upcomingEvents: await Event.countDocuments({ ...scope, department: department._id, date: { $gte: new Date() } })
    })));
    res.json(report);
  } catch (error) { next(error); }
});

router.post("/admin/accounts", allowRoles("admin"), async (req, res, next) => {
  try {
    const { name, email, password, role, department } = req.body;
    if (!name?.trim() || !emailPattern.test(email || "") || !password || password.length < 8 || !["faculty", "hod", "admin"].includes(role)) {
      return res.status(400).json({ message: "Provide a name, valid email, password of at least 8 characters, and a privileged role" });
    }
    if (["faculty", "hod"].includes(role) && !department) {
      return res.status(400).json({ message: "Faculty and HOD accounts must be assigned to a department" });
    }
    if (department && !(await Department.exists({ _id: department }))) return res.status(400).json({ message: "Choose a valid department" });
    const user = await User.create({
      name: name.trim(), email: email.toLowerCase().trim(), password: await bcrypt.hash(password, 12),
      role, department: department || undefined, status: "approved"
    });
    if (role === "faculty" || role === "hod") await FacultyProfile.create({ user: user._id });
    res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role, status: user.status });
  } catch (error) { next(error); }
});

router.get("/admin/pending", allowRoles("admin", "hod"), async (req, res, next) => {
  try {
    res.json(await User.find({ ...scopedDepartment(req.user), role: "alumni", status: "pending" })
      .select(publicUserFields).populate("department", "name code").sort({ createdAt: 1 }));
  } catch (error) { next(error); }
});

router.patch("/admin/users/:id/approval", allowRoles("admin", "hod"), async (req, res, next) => {
  try {
    if (!["approved", "rejected"].includes(req.body.status)) return res.status(400).json({ message: "Choose approved or rejected" });
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, ...scopedDepartment(req.user), role: "alumni", status: "pending" },
      { status: req.body.status }, { new: true }
    );
    if (!user) return res.status(404).json({ message: "Pending alumni registration not found in your department" });
    await notify(user._id, `Your alumni registration was ${req.body.status}`, "/dashboard");
    res.json({ message: `Alumni registration ${req.body.status}`, user: { _id: user._id, name: user.name, status: user.status } });
  } catch (error) { next(error); }
});

router.post("/admin/departments", allowRoles("admin"), async (req, res, next) => {
  try {
    if (!req.body.name?.trim() || !req.body.code?.trim()) return res.status(400).json({ message: "Department name and code are required" });
    res.status(201).json(await Department.create({ name: req.body.name, code: req.body.code, description: req.body.description }));
  } catch (error) { next(error); }
});

router.patch("/admin/departments/:id", allowRoles("admin"), async (req, res, next) => {
  try {
    const fields = ["name", "code", "description"];
    const updates = {};
    fields.forEach((key) => { if (req.body[key] !== undefined) updates[key] = req.body[key]; });
    const department = await Department.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!department) return res.status(404).json({ message: "Department not found" });
    res.json(department);
  } catch (error) { next(error); }
});

router.delete("/admin/departments/:id", allowRoles("admin"), async (req, res, next) => {
  try {
    if (await User.exists({ department: req.params.id })) return res.status(409).json({ message: "Reassign department users before deleting this department" });
    if (await Promise.all([
      Job.exists({ department: req.params.id }),
      Event.exists({ department: req.params.id }),
      Announcement.exists({ department: req.params.id }),
      Resource.exists({ department: req.params.id })
    ]).then((results) => results.some(Boolean))) {
      return res.status(409).json({ message: "Remove or reassign department content before deleting this department" });
    }
    const result = await Department.deleteOne({ _id: req.params.id });
    if (!result.deletedCount) return res.status(404).json({ message: "Department not found" });
    res.json({ message: "Department deleted" });
  } catch (error) { next(error); }
});

module.exports = router;
