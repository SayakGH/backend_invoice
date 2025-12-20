const paymentsRepo = require("../repository/payments.repo");

// GET /api/v1/payments/:limit&:cursor
exports.getPayments = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const cursor = req.query.cursor || null;
    const search = req.query.search || "";

    const { payments, nextCursor } = await paymentsRepo.getAllPayments({
      limit,
      cursor,
      search,
    });

    res.status(200).json({
      payments,
      nextCursor,
    });
  } catch (err) {
    console.error("Payments error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};
