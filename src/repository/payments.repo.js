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

const getAllPayments = async ({ limit = 20, cursor = null, search = "" }) => {
  const params = {
    TableName: PAYMENT_TABLE,
    Limit: limit,
  };

  if (cursor) {
    params.ExclusiveStartKey = JSON.parse(
      Buffer.from(cursor, "base64").toString("utf-8")
    );
  }

  if (search && search.trim() !== "") {
    params.FilterExpression = `
      contains(#pid, :s) OR
      contains(invoiceId, :s)
    `;

    params.ExpressionAttributeNames = {
      "#pid": "_id",
    };

    params.ExpressionAttributeValues = {
      ":s": search,
    };
  }

  const command = new ScanCommand(params);
  const result = await dynamoDB.send(command);

  const sortedPayments = (result.Items || []).sort((a, b) => {
    // Extract DATE part (YYYY-MM-DD)
    const dateA = a.createdAt.split("T")[0];
    const dateB = b.createdAt.split("T")[0];

    if (dateA !== dateB) {
      // 🔹 Sort by DATE (latest first)
      return dateB.localeCompare(dateA);
    }

    // If DATE is same, compare TIME (HH:mm:ss.sss)
    const timeA = a.createdAt.split("T")[1];
    const timeB = b.createdAt.split("T")[1];

    // 🔹 Sort by TIME (latest first)
    return timeB.localeCompare(timeA);
  });

  return {
    payments: sortedPayments,
    nextCursor: result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64")
      : null,
  };
};

module.exports = {
  createPayment,
  getAllPayments,
};
