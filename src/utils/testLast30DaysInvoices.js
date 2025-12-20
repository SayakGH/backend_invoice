const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { dynamoDB } = require("../config/dynamo");

const TABLE_NAME = "Invoice_app_invoices";

const fetchLast30DaysInvoices = async () => {
  try {
    // ✅ ISO string for 30 days ago
    const thirtyDaysAgoISO = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const params = {
      TableName: TABLE_NAME,

      // ✅ STRING-to-STRING comparison (FIXED)
      FilterExpression: "createdAt >= :dateLimit",

      // ✅ Only required fields
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

    console.log(`Invoices created in last 30 days: ${invoices.length}`);
    console.log("------------------------------------------------");

    invoices.forEach((inv, index) => {
      console.log({
        _id: inv._id,
        phone: inv.phone,
        advance: inv.advance,
        remainingAmount: inv.remainingAmount
      });
    });

  } catch (err) {
    console.error("Error fetching invoices:", err.message);
  }
};

fetchLast30DaysInvoices();
