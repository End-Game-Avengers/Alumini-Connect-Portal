const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    bio: { type: String, trim: true, maxlength: 1500 },
    company: { type: String, trim: true, maxlength: 120 },
    designation: { type: String, trim: true, maxlength: 120 },
    skills: [{ type: String, trim: true }],
    experience: { type: Number, min: 0, max: 80, default: 0 },
    profileImage: { type: String, trim: true },
    availableForMentorship: { type: Boolean, default: false },
    achievements: [{ type: String, trim: true }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("AlumniProfile", schema);
