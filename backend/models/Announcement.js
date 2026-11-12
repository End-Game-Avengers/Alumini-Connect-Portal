const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    audience: { type: String, enum: ["all", "students", "alumni", "department"], default: "all" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Announcement", schema);
