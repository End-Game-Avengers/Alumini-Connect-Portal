const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["submitted", "reviewing", "accepted", "rejected"], default: "submitted" },
    message: { type: String, trim: true, maxlength: 2000 }
  },
  { timestamps: true }
);

schema.index({ job: 1, applicant: 1 }, { unique: true });
module.exports = mongoose.model("Application", schema);
