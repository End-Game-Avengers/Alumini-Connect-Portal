const express = require("express");
const { listDepartments, getOverview, submitContact } = require("../controllers/publicController");

const router = express.Router();
router.get("/departments", listDepartments);
router.get("/overview", getOverview);
router.post("/contact", submitContact);

module.exports = router;
