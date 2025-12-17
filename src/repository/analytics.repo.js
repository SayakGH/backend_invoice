const {
  GetCommand,
  PutCommand,
  ScanCommand,
  DeleteCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { dynamoDB } = require("../config/dynamo");

const TABLE_NAME = "Invoice_app_invoices";

const analytics = async () => {
  const params = {
    TableName: TABLE_NAME,
    ProjectionExpression: "advance, remainingAmount",
  };

  try {
    const command = new ScanCommand(params);
    const result = await dynamoDB.send(command);

    const invoices = result.Items || [];

    let totalPaid = 0;
    let totalDue = 0;

    for (const inv of invoices) {
      totalPaid += Number(inv.advance || 0);
      totalDue += Number(inv.remainingAmount || 0);
    }

    return {
      totalInvoices: invoices.length,
      totalPaid,
      totalDue,
    };
  } catch (err) {
    throw new Error(`DynamoDB Analytics Error: ${err.message}`);
  }
};

module.exports = {
  analytics,
};
