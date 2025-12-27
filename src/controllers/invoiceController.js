const invoiceRepo = require("../repository/invoice.repo");
const paymentRepo = require("../repository/payments.repo");
const userRepo = require("../repository/user.repo");
const { COMPANY_MASTER } = require("../constants/companyMaster");

// POST /api/v1/invoices/create
exports.createInvoice = async (req, res) => {
  try {
    const { userId, role } = req.user;

    let executiveName = "System";

    if (role === "user") {
      const user = await userRepo.findUserById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      executiveName = user.name;
    }

    const companyName = req.body.data.company;
    const companyDetails = COMPANY_MASTER[companyName];

    if (!companyDetails) {
      return res.status(401).json({ message: "Invalid Company name" });
    }

    const InvoiceData = {
      ...req.body.data,

      executiveName,

      version: 1,
      isOriginal: true,
      previousInvoiceId: null,

      company: {
        name: companyDetails.name,
        address: companyDetails.address,
        phone: companyDetails.phone,
        email: companyDetails.email,
      },
    };

    const newInvoice = await invoiceRepo.createInvoice(InvoiceData);

    // Create initial payment record (Advance)
    if (newInvoice.advance > 0) {
      await paymentRepo.createPayment({
        invoiceId: newInvoice._id,
        customerName: newInvoice.customer.name,
        amount: newInvoice.advance,
        paymentMode: newInvoice.payment.mode,
        chequeNumber: newInvoice.payment.chequeNumber,
        bankName: newInvoice.payment.bankName,
      });
    }

    res.status(201).json({
      message: "Invoice successfully created",
      invoice: newInvoice,
      invoiceVersion: 1,
    });
  } catch (err) {
    console.error("Invoice Creation error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/v1/invoices
exports.getAllInvoices = async (req, res) => {
  try {
    const invoices = await invoiceRepo.getAllInvoices();

    res.status(200).json({
      success: true,
      count: invoices.length,
      invoices,
    });
  } catch (err) {
    console.error("Get Invoices Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

//PUT /api/v1/invoices/update/:id
exports.updateInvoice = async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const { customerName, amount, paymentMode, chequeNumber, bankName } =
      req.body;

    const updateInvoice = await invoiceRepo.updateInvoicePayment(
      invoiceId,
      amount,
      paymentMode,
      chequeNumber,
      bankName
    );

    const payment = await paymentRepo.createPayment({
      invoiceId: updateInvoice._id,
      customerName: customerName,
      amount: amount,
      paymentMode: paymentMode,
      chequeNumber: chequeNumber,
      bankName: bankName,
    });

    res.status(200).json({
      message: "Invoice successfully updated",
      invoice: updateInvoice,
    });
  } catch (err) {
    console.error("Invoice Update error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getInvoiceHistory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "latestInvoiceId is required",
      });
    }

    const history = await invoiceRepo.getPreviousInvoiceHistory(id);

    return res.status(200).json({
      success: true,
      count: history.length,
      invoices: history,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch invoice history",
    });
  }
};

// DELETE /api/v1/invoices/:id
exports.deleteInvoice = async (req, res) => {
  try {
    const invoiceId = req.params.id;

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        message: "Invoice ID is required",
      });
    }

    const paymentDeleteResult = await paymentRepo.deletePaymentsByInvoiceId(
      invoiceId
    );

    const invoiceDeleteResult = await invoiceRepo.deleteInvoiceById(invoiceId);

    res.status(200).json({
      success: true,
      message: "Invoice and related payments deleted successfully",
    });
  } catch (err) {
    console.error("Delete Invoice Error:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getMyInvoices = async (req, res) => {
  try {
    const some = req.user;
    const userId = req.user._id;
    const role = req.user.role;

    if (role !== "user") {
      return res.status(403).json({ message: "Only executives allowed" });
    }

    const user = await userRepo.findUserById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const invoices = await invoiceRepo.getInvoicesByExecutiveName(user.name);

    res.status(200).json({
      success: true,
      count: invoices.length,
      invoices,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
