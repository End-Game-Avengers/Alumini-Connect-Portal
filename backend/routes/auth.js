const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const express = require("express");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const Department = require("../models/Department");
const StudentProfile = require("../models/StudentProfile");
const AlumniProfile = require("../models/AlumniProfile");
const FacultyProfile = require("../models/FacultyProfile");
const { requireAuth } = require("../middleware/auth");
const notify = require("../utils/notify");

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const publicUser = (user) => {
  const record = user.toObject ? user.toObject() : { ...user };
  delete record.password;
  delete record.resetTokenHash;
  delete record.resetTokenExpires;
  return record;
};

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, phone, department, course, graduationYear, enrollmentNumber, role } = req.body;
    if (!name?.trim() || !emailPattern.test(email || "") || !password || password.length < 8 || !department) {
      return res.status(400).json({ message: "Enter your name, a valid email, a password of at least 8 characters, and a department" });
    }
    if (!["student", "alumni"].includes(role)) {
      return res.status(400).json({ message: "Public registration is limited to students and alumni" });
    }
    if (department && !(await Department.exists({ _id: department }))) {
      return res.status(400).json({ message: "Choose a valid department" });
    }
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: await bcrypt.hash(password, 12),
      phone,
      department: department || undefined,
      course,
      graduationYear: graduationYear ? Number(graduationYear) : undefined,
      enrollmentNumber,
      role,
      status: role === "alumni" ? "pending" : "approved"
    });

    if (role === "student") await StudentProfile.create({ user: user._id });
    if (role === "alumni") {
      await AlumniProfile.create({ user: user._id });
      await notify(user._id, "Your alumni account is waiting for department or administrator approval.");
    }
    res.status(201).json({
      message: role === "alumni" ? "Registration submitted for approval" : "Account created. You can now sign in.",
      status: user.status
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await bcrypt.compare(req.body.password || "", user.password))) {
      return res.status(401).json({ message: "Email or password is incorrect" });
    }
    if (user.status !== "approved") {
      return res.status(403).json({
        message: user.status === "pending" ? "Your account is awaiting approval" : "This registration was not approved"
      });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
    res.json({ token, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", requireAuth, (req, res) => res.json({ message: "Signed out" }));

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const [studentProfile, alumniProfile, facultyProfile] = await Promise.all([
      req.user.role === "student" ? StudentProfile.findOne({ user: req.user._id }) : null,
      req.user.role === "alumni" ? AlumniProfile.findOne({ user: req.user._id }) : null,
      ["faculty", "hod"].includes(req.user.role) ? FacultyProfile.findOne({ user: req.user._id }) : null
    ]);
    res.json({ user: req.user, profile: studentProfile || alumniProfile || facultyProfile || {} });
  } catch (error) {
    next(error);
  }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    const genericMessage = "If an approved account exists for that email, password reset instructions will be sent.";
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      return res.status(503).json({ message: "Password reset email is not configured. Contact the portal administrator." });
    }
    const user = await User.findOne({ email });
    if (!user || user.status !== "approved") return res.json({ message: genericMessage });

    const token = crypto.randomBytes(32).toString("hex");
    user.resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
    user.resetTokenExpires = Date.now() + 60 * 60 * 1000;
    await user.save();

    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
    });
    const clientUrl = (process.env.CLIENT_URL || process.env.URL || "http://localhost:5173").split(",")[0].replace(/\/$/, "");
    const resetUrl = `${clientUrl}/reset-password?token=${token}`;
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: user.email,
      subject: "Reset your Alumni Connect password",
      text: `Use this link within one hour to reset your password: ${resetUrl}`
    });
    res.json({ message: genericMessage });
  } catch (error) {
    next(error);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8) {
      return res.status(400).json({ message: "Provide a valid reset token and a password of at least 8 characters" });
    }
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({ resetTokenHash: tokenHash, resetTokenExpires: { $gt: Date.now() } })
      .select("+resetTokenHash +resetTokenExpires");
    if (!user) return res.status(400).json({ message: "This password reset link is invalid or expired" });
    user.password = await bcrypt.hash(password, 12);
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    await user.save();
    res.json({ message: "Password updated. You can now sign in." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
