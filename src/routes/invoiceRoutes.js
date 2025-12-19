const router = require("express").Router();
const {
  createInvoice,
  getAllInvoices,
  updateInvoice,
  generatePDF,
} = require("../controllers/invoiceController");
const auth = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

router.post("/create", auth, createInvoice);
router.get("/", auth, authorizeRoles("admin"), getAllInvoices);
router.put("/update/:id", auth, authorizeRoles("admin"), updateInvoice);
router.get("/pdf/:id", auth, generatePDF);

module.exports = router;
