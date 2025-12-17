const router = require("express").Router();
const { getAnalytics } = require("../controllers/analyticsController");
const auth = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

router.get("/", auth, authorizeRoles("admin"), getAnalytics);
module.exports = router;
