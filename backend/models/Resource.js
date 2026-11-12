const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, trim: true, maxlength: 1500 },
    url: { type: String, required: true, trim: true, maxlength: 1000 },
    type: { type: String, enum: ["article", "course", "video", "document", "other"], default: "other" },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Resource", schema);
