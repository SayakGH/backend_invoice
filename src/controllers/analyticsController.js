const analyticsRepo = require("../repository/analytics.repo");
const { fetchInvoicesForGraph } = require("../repository/analyticsGraph.repo");
const { COMPANY_MASTER } = require("../constants/companyMaster");

// GET /api/v1/analytics
exports.getAnalytics = async (req, res) => {
  try {
    // Fetch total analytics
    const analyticsData = await analyticsRepo.analytics();

    // Fetch invoices for graph
    const graphInvoices = await fetchInvoicesForGraph();

    res.status(200).json({
      success: true,
      analytics: analyticsData,      // totalPaid, totalDue, totalInvoices
      graphData: graphInvoices       // array of invoices for graphing
    });

  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
