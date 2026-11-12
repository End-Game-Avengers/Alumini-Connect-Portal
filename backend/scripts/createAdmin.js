require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const connectDatabase = require("../config/db");

async function createAdmin() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    throw new Error("Set ADMIN_NAME, ADMIN_EMAIL, and an ADMIN_PASSWORD of at least 12 characters in backend/.env");
  }
  await connectDatabase();
  const email = ADMIN_EMAIL.toLowerCase().trim();
  const existing = await User.findOne({ email });
  if (existing) throw new Error(`An account already uses ${email}; use the admin account creation endpoint instead`);
  const user = await User.create({
    name: ADMIN_NAME, email, password: await bcrypt.hash(ADMIN_PASSWORD, 12), role: "admin", status: "approved"
  });
  console.log(`Administrator created: ${user.email}`);
}

createAdmin()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });
