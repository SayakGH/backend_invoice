const router = require("express").Router();

const { getPayments } = require("../controllers/paymentController");
const auth = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

router.get("/", auth, authorizeRoles("admin"), getPayments);
module.exports = router;
