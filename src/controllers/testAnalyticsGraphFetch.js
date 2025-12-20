const { fetchInvoicesForGraph } = require("../repository/analyticsGraph.repo");

const testFetchInvoicesForGraph = async () => {
  try {
    const invoices = await fetchInvoicesForGraph();

    console.log(`Invoices fetched for graph: ${invoices.length}`);
    console.log("------------------------------------------------");

    invoices.forEach((inv, index) => {
      console.log(`Invoice ${index + 1}:`, inv);
    });

  } catch (err) {
    console.error("Error fetching invoices for graph:", err.message);
  }
};

testFetchInvoicesForGraph();
