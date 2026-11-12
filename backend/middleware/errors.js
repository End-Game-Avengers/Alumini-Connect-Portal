function notFound(req, res) {
  res.status(404).json({ message: "API route not found" });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  console.error(error);
  if (error.code === 11000) {
    return res.status(409).json({ message: "A record with that value already exists" });
  }
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ message: error.message });
  }
  res.status(500).json({ message: "An unexpected server error occurred" });
}

module.exports = { notFound, errorHandler };
