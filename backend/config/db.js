const mongoose = require("mongoose");
const Department = require("../models/Department");
const defaultDepartments = require("../utils/defaultDepartments");

async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  await Department.bulkWrite(
    defaultDepartments.map((department) => ({
      updateOne: {
        filter: { code: department.code },
        update: { $setOnInsert: department },
        upsert: true
      }
    })),
    { ordered: false }
  );
  console.log("Connected to MongoDB");
}

module.exports = connectDatabase;
