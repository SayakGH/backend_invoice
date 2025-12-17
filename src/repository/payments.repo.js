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

  const newPayment = {
    _id: paymentId,
    customerName,
    invoiceId,
    amount,
    paymentMode,
    createdAt: new Date().toISOString(),
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

const getAllPayments = async () => {
  const params = {
    TableName: PAYMENT_TABLE,
  };

  try {
    const command = new ScanCommand(params);
    const result = await dynamoDB.send(command);

    const payments = (result.Items || []).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return payments;
  } catch (err) {
    throw new Error(`DynamoDB Fetch Payments Error: ${err.message}`);
  }
};

module.exports = {
  createPayment,
  getAllPayments,
};
