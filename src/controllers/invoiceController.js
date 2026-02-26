const invoiceRepo = require("../repository/invoice.repo");
const paymentRepo = require("../repository/payments.repo");
const userRepo = require("../repository/user.repo");
const cancellationRepo = require("../repository/cancellation.repo");
const { COMPANY_MASTER } = require("../constants/companyMaster");
const axios = require("axios");
require("dotenv").config();

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
  let createdInvoice = null;
  let createdPayment = null;

  try {
    const invoiceId = req.params.id;
    const { customerName, amount, paymentMode, chequeNumber, bankName } =
      req.body;

    const check = await cancellationRepo.hasCancellationForInvoice(invoiceId);

    if (check) {
      return res.status(409).json({
        success: false,
        message: "Invoice Has already been cancelled",
      });
    }

    /**
     * 1️⃣ Create new invoice version
     */
    createdInvoice = await invoiceRepo.updateInvoicePayment(
      invoiceId,
      amount,
      paymentMode,
      chequeNumber,
      bankName,
    );

    /**
     * 2️⃣ Create payment
     */
    createdPayment = await paymentRepo.createPayment({
      invoiceId: createdInvoice._id,
      customerName,
      amount,
      paymentMode,
      chequeNumber,
      bankName,
    });

    /**
     * 3️⃣ Swap latest invoice on flat
     */
    await axios.patch(
      `${process.env.ESTATEFLOW_BASEURL}/api/v1/invoices/flats/swap-latest-invoice`,
      {
        currentLatestInvoiceId: invoiceId,
        newLatestInvoiceId: createdInvoice._id,
      },
    );

    // ✅ All succeeded
    return res.status(200).json({
      success: true,
      message: "Invoice successfully updated",
      invoice: createdInvoice,
    });
  } catch (err) {
    console.error("Invoice Update error:", err);

    /**
     * 🔁 ROLLBACK (reverse order)
     */

    // Rollback payment
    if (createdPayment) {
      try {
        await paymentRepo.deletePaymentById(createdPayment.paymentId);
      } catch (rollbackErr) {
        console.error("Payment rollback failed:", rollbackErr);
      }
    }

    // Rollback invoice version
    if (createdInvoice) {
      try {
        await invoiceRepo.deleteInvoiceById(createdInvoice._id);
      } catch (rollbackErr) {
        console.error("Invoice rollback failed:", rollbackErr);
      }
    }

    return res.status(500).json({
      success: false,
      message: "Invoice update failed. Changes were rolled back.",
      error: err.message,
    });
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
  let deletedInvoices = [];
  let deletedPayments = [];

  try {
    const invoiceId = req.params.id;

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        message: "Invoice ID is required",
      });
    }

    /**
     * 1️⃣ Check cancellation
     */
    const isCancelled =
      await cancellationRepo.hasCancellationForInvoice(invoiceId);

    /**
     * =========================================================
     * 🚨 CASE A — Invoice is cancelled → DELETE FULL CHAIN
     * =========================================================
     */
    if (isCancelled) {
      const chain = await invoiceRepo.getFullInvoiceChain(invoiceId);

      if (!chain.length) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      // Backup
      deletedInvoices = chain;

      // Backup payments
      for (const inv of chain) {
        const pays = await paymentRepo.getLatestPaymentsByInvoiceId(inv._id);
        deletedPayments.push(...pays);
      }

      /**
       * 🧨 Delete payments first
       */
      for (const inv of chain) {
        await paymentRepo.deletePaymentsByInvoiceId(inv._id);
      }

      /**
       * 🧨 Delete all invoice versions
       */
      for (const inv of chain) {
        await invoiceRepo.deleteInvoiceById(inv._id);
      }

      return res.status(200).json({
        success: true,
        message: "Cancelled invoice chain deleted successfully",
        deletedCount: chain.length,
      });
    }

    /**
     * =========================================================
     * ✅ CASE B — Normal delete (your old logic)
     * =========================================================
     */

    const invoice = await invoiceRepo.getInvoiceById(invoiceId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    deletedInvoices = [invoice];

    deletedPayments = await paymentRepo.getPaymentsByInvoiceId(invoiceId);

    await paymentRepo.deletePaymentsByInvoiceId(invoiceId);
    await invoiceRepo.deleteInvoiceById(invoiceId);

    await axios.patch(
      `${process.env.ESTATEFLOW_BASEURL}/api/v1/invoices/flats/swap-latest-invoice`,
      {
        currentLatestInvoiceId: invoiceId,
        newLatestInvoiceId: invoice.previousInvoiceId ?? null,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Invoice and related payments deleted successfully",
    });
  } catch (err) {
    console.error("Delete Invoice Error:", err);

    /**
     * 🔁 ROLLBACK
     */
    try {
      for (const inv of deletedInvoices) {
        await invoiceRepo.createInvoice(inv);
      }

      for (const pay of deletedPayments) {
        await paymentRepo.createPayment(pay);
      }
    } catch (rollbackErr) {
      console.error("Rollback failed:", rollbackErr);
    }

    return res.status(500).json({
      success: false,
      message: "Delete failed. State was restored.",
      error: err.message,
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

// PUT /api/v1/invoices/update-phone/:id
exports.updateInvoicePhone = async (req, res) => {
  try {
    const { id } = req.params;
    const { phone } = req.body;

    if (!id || !phone) {
      return res.status(400).json({
        success: false,
        message: "Invoice ID and phone are required",
      });
    }

    const updated = await invoiceRepo.updateInvoiceCustomerPhone(id, phone);

    return res.status(200).json({
      success: true,
      message: "Customer phone updated successfully",
      invoice: updated,
    });
  } catch (err) {
    console.error("Update Phone Error:", err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// PUT /api/v1/invoices/update-pan/:id
exports.updateInvoicePAN = async (req, res) => {
  try {
    const { id } = req.params;
    const { pan } = req.body;

    if (!id || !pan) {
      return res.status(400).json({
        success: false,
        message: "Invoice ID and PAN are required",
      });
    }

    const updated = await invoiceRepo.updateInvoiceCustomerPAN(id, pan);

    return res.status(200).json({
      success: true,
      message: "Customer PAN updated successfully",
      invoice: updated,
    });
  } catch (err) {
    console.error("Update PAN Error:", err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};
