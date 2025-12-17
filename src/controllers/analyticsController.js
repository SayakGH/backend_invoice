const analyticsRepo = require("../repository/analytics.repo");
const { COMPANY_MASTER } = require("../constants/companyMaster");

// GET /api/v1/analytics
exports.getAnalytics = async (req, res) => {
  try {
    const analyticsData = await analyticsRepo.analytics();

    res.status(200).json({
      success: true,
      analytics: analyticsData,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
