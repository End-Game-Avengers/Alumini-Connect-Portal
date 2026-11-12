const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    type: { type: String, enum: ["job", "internship"], required: true },
    company: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    skills: [{ type: String, trim: true }],
    eligibility: { type: String, trim: true, maxlength: 1000 },
    location: { type: String, trim: true, maxlength: 150 },
    compensation: { type: String, trim: true, maxlength: 100 },
    applicationDeadline: { type: Date },
    applicationLink: {
      type: String,
      trim: true,
      maxlength: 500,
      validate: {
        validator: (value) => !value || /^https?:\/\//i.test(value),
        message: "Application links must start with http:// or https://"
      }
    },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", schema);
