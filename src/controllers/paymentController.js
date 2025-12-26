const paymentsRepo = require("../repository/payments.repo");

// GET /api/v1/analytics
exports.getPayments = async (req, res) => {
  try {
    const paymentsData = await paymentsRepo.getAllPayments();

    res.status(200).json({
      payments: paymentsData,
    });
  } catch (err) {
    console.error("Payments error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

//GET /api/payments/latest/:id

exports.getLatestPayment = async (req, res) => {
  try {
    const invoiceId = req.params.id;

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        message: "invoiceId is required",
      });
    }

    const latestPayment = await paymentsRepo.getLatestPaymentByInvoiceId(
      invoiceId
    );

    if (!latestPayment) {
      return res.status(404).json({
        success: false,
        message: "No payment found for this invoice",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      data: latestPayment,
    });
  } catch (err) {
    console.error("Get Latest Payment Error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch latest payment",
      error: err.message,
    });
  }
};
