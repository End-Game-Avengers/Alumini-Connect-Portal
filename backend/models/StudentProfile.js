const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    bio: { type: String, trim: true, maxlength: 1000 },
    skills: [{ type: String, trim: true }],
    profileImage: { type: String, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudentProfile", schema);
