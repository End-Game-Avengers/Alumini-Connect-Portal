const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    link: { type: String, trim: true, maxlength: 300 },
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", schema);
