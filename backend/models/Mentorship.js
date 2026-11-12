const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    alumni: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" }
  },
  { timestamps: true }
);

schema.index({ student: 1, alumni: 1 }, { unique: true });
module.exports = mongoose.model("Mentorship", schema);
