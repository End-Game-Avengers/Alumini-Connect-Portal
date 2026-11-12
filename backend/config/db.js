const mongoose = require("mongoose");
const Department = require("../models/Department");
const defaultDepartments = require("../utils/defaultDepartments");

let connectionPromise;

function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required");
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI)
      .then(async () => {
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
        return mongoose.connection;
      })
      .catch((error) => {
        connectionPromise = null;
        throw error;
      });
  }

  return connectionPromise;
}

module.exports = connectDatabase;
