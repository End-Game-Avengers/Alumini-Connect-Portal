const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    phone: { type: String, trim: true, maxlength: 30 },
    role: {
      type: String,
      enum: ["student", "alumni", "faculty", "hod", "admin"],
      required: true
    },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    course: { type: String, trim: true, maxlength: 100 },
    graduationYear: { type: Number, min: 1950, max: 2100 },
    enrollmentNumber: { type: String, trim: true, maxlength: 50 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved"
    },
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false }
  },
  { timestamps: true }
);

userSchema.index({ role: 1, status: 1 });
module.exports = mongoose.model("User", userSchema);
