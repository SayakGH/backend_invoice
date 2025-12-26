const router = require("express").Router();

const {
  getPayments,
  getLatestPayment,
} = require("../controllers/paymentController");
const auth = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

router.get("/", auth, authorizeRoles("admin"), getPayments);
router.get("/:id", auth, authorizeRoles("admin"), getLatestPayment);
module.exports = router;
