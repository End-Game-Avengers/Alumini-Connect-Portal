const Notification = require("../models/Notification");

async function notify(recipient, message, link) {
  try {
    await Notification.create({ recipient, message, link });
  } catch (error) {
    console.error("Could not save notification:", error);
  }
}

module.exports = notify;
