const paymentsRepo = require("../repository/payments.repo");

// GET /api/v1/payments/:limit&:cursor
exports.getPayments = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const cursor = req.query.cursor || null;

    const { payments, nextCursor } = await paymentsRepo.getAllPayments({
      limit,
      cursor,
    });

    res.status(200).json({
      success: true,
      count: payments.length,
      payments,
      nextCursor,
    });
  } catch (err) {
    console.error("Payments error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};
