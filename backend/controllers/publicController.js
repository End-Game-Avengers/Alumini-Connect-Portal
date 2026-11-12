const User = require("../models/User");
const Department = require("../models/Department");
const AlumniProfile = require("../models/AlumniProfile");
const Event = require("../models/Event");
const Job = require("../models/Job");
const Notification = require("../models/Notification");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function listDepartments(req, res, next) {
  try {
    res.json(await Department.find().sort({ name: 1 }));
  } catch (error) {
    next(error);
  }
}

async function getOverview(req, res, next) {
  try {
    const [students, alumni, events, jobs, departments, profiles] = await Promise.all([
      User.countDocuments({ role: "student", status: "approved" }),
      User.countDocuments({ role: "alumni", status: "approved" }),
      Event.find({ date: { $gte: new Date() } }).populate("createdBy", "name").sort({ date: 1 }).limit(3),
      Job.countDocuments({ active: true }),
      Department.countDocuments(),
      AlumniProfile.find({}).populate({
        path: "user", match: { status: "approved" }, select: "name department graduationYear",
        populate: { path: "department", select: "name" }
      }).sort({ experience: -1 }).limit(3)
    ]);

    res.json({
      stats: { students, alumni, events: await Event.countDocuments({ date: { $gte: new Date() } }), jobs, departments },
      events,
      alumni: profiles.filter((profile) => profile.user).map((profile) => ({
        user: profile.user,
        profile: { company: profile.company, designation: profile.designation, skills: profile.skills }
      }))
    });
  } catch (error) {
    next(error);
  }
}

async function submitContact(req, res, next) {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const message = String(req.body.message || "").trim();
    if (!name || name.length > 100 || email.length > 254 || !emailPattern.test(email) || message.length < 10 || message.length > 400) {
      return res.status(400).json({ message: "Enter your name, a valid email address, and a message of 10–400 characters" });
    }

    const admins = await User.find({ role: "admin", status: "approved" }).select("_id");
    if (!admins.length) return res.status(503).json({ message: "The college administrator has not set up a contact recipient yet" });
    await Notification.insertMany(admins.map((admin) => ({
      recipient: admin._id,
      message: `Website contact from ${name} (${email}): ${message}`
    })));
    res.status(201).json({ message: "Thanks for reaching out. Your message has been sent to the college administrator." });
  } catch (error) {
    next(error);
  }
}

module.exports = { listDepartments, getOverview, submitContact };
