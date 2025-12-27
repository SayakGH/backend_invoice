const router = require("express").Router();
const {
  createInvoice,
  getAllInvoices,
  updateInvoice,
  deleteInvoice,
  getMyInvoices,
  getInvoiceHistory,
} = require("../controllers/invoiceController");
const auth = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

router.post("/create", auth, createInvoice);
router.get("/", auth, authorizeRoles("admin"), getAllInvoices);
router.put("/update/:id", auth, updateInvoice);
router.get("/user", auth, authorizeRoles("user"), getMyInvoices);
router.get("/history/:id", auth, getInvoiceHistory);
router.delete("/:id", auth, authorizeRoles("admin"), deleteInvoice);

module.exports = router;
