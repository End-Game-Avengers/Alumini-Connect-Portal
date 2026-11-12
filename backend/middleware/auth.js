const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Sign in to continue" });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: "Your session is invalid or has expired" });
  }

  try {
    const user = await User.findById(payload.id).select("-password");
    if (!user || user.status !== "approved") {
      return res.status(401).json({ message: "This account is not active" });
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to do that" });
    }
    next();
  };
}

module.exports = { requireAuth, allowRoles };
