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
