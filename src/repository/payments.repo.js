const { PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { dynamoDB } = require("../config/dynamo");

const PAYMENT_TABLE = "Invoice_app_payments";

const createPayment = async ({
  invoiceId,
  customerName,
  amount,
  paymentMode,
  chequeNumber,
  bankName,
}) => {
  const paymentId = uuidv4();

  const now = new Date();
  const istDate = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

  const newPayment = {
    _id: paymentId,
    customerName,
    invoiceId,
    amount,
    paymentMode,
    createdAt: istDate.toISOString(),
  };

  // Add cheque details only if mode is Cheque
  if (paymentMode === "Cheque") {
    newPayment.chequeNumber = chequeNumber;
    newPayment.bankName = bankName;
  }

  const params = {
    TableName: PAYMENT_TABLE,
    Item: newPayment,
    ConditionExpression: "attribute_not_exists(#id)",
    ExpressionAttributeNames: {
      "#id": "_id",
    },
  };

  try {
    await dynamoDB.send(new PutCommand(params));
    return newPayment;
  } catch (err) {
    throw new Error(`DynamoDB Payment Create Error: ${err.message}`);
  }
};

const getAllPayments = async ({ limit = 10, cursor = null }) => {
  const params = {
    TableName: PAYMENT_TABLE,
    Limit: limit,
  };

  if (cursor) {
    params.ExclusiveStartKey = JSON.parse(
      Buffer.from(cursor, "base64").toString("utf-8")
    );
  }

  try {
    const command = new ScanCommand(params);
    const result = await dynamoDB.send(command);

    const payments = (result.Items || []).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return {
      payments,
      nextCursor: result.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
            "base64"
          )
        : null,
    };
  } catch (err) {
    throw new Error(`DynamoDB Fetch Payments Error: ${err.message}`);
  }
};

module.exports = {
  createPayment,
  getAllPayments,
};
