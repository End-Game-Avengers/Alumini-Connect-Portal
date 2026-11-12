const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    type: { type: String, enum: ["alumni-meet", "workshop", "guest-lecture", "webinar", "placement-drive", "reunion", "other"], default: "other" },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    date: { type: Date, required: true },
    location: { type: String, required: true, trim: true, maxlength: 200 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", schema);
