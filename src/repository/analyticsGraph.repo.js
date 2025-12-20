const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { dynamoDB } = require("../config/dynamo");

const TABLE_NAME = "Invoice_app_invoices";

const fetchInvoicesForGraph = async () => {
  try {
    // ✅ ISO string for 30 days ago
    const thirtyDaysAgoISO = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const params = {
      TableName: TABLE_NAME,

      // ✅ Filter invoices created in last 30 days
      FilterExpression: "createdAt >= :dateLimit",

      // ✅ Only required fields for graph
      ProjectionExpression: "#id, phone, advance, remainingAmount, createdAt",

      ExpressionAttributeNames: {
        "#id": "_id"
      },

      ExpressionAttributeValues: {
        ":dateLimit": thirtyDaysAgoISO
      }
    };

    const command = new ScanCommand(params);
    const result = await dynamoDB.send(command);

    const invoices = result.Items || [];

    // Format invoices for graph
    const formattedInvoices = invoices.map((inv) => ({
      _id: inv._id,
      phone: inv.phone,
      advance: inv.advance,
      remainingAmount: inv.remainingAmount,
      createdAt: inv.createdAt
    }));

    return formattedInvoices;

  } catch (err) {
    throw new Error(`DynamoDB Analytics Graph Error: ${err.message}`);
  }
};

module.exports = {
  fetchInvoicesForGraph,
};
