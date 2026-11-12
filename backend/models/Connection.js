const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" }
  },
  { timestamps: true }
);

schema.index({ requester: 1, recipient: 1 }, { unique: true });
module.exports = mongoose.model("Connection", schema);
