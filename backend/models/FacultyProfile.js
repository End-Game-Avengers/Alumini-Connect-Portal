const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    designation: { type: String, trim: true, maxlength: 120 },
    profileImage: { type: String, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("FacultyProfile", schema);
