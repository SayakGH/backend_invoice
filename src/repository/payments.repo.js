const {
  PutCommand,
  ScanCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");

const uuidv4 = () => randomUUID();

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

  // Convert to IST (UTC + 5:30)
  const now = new Date();
  const istDate = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

  const newPayment = {
    _id: paymentId,
    customerName,
    invoiceId,
    amount,
    paymentMode,
    createdAt: istDate.toISOString(), // IST stored as ISO
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

const getLast30DaysPaymentsSummary = async () => {
  try {
    const command = new ScanCommand({
      TableName: PAYMENT_TABLE,
    });

    const result = await dynamoDB.send(command);
    const payments = result.Items || [];

    /* ================================
       Prepare date helpers
    ================================= */

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 29); // last 30 days incl today

    /* ================================
       Create base map with 0 values
    ================================= */

    const dateMap = {};

    for (let i = 0; i < 30; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);

      const key = d.toISOString().split("T")[0]; // YYYY-MM-DD

      dateMap[key] = {
        price: 0,
        day: d.getDate(),
        month: d.toLocaleString("en-IN", { month: "short" }),
      };
    }

    /* ================================
       Aggregate payments
    ================================= */

    for (const payment of payments) {
      if (!payment.createdAt || !payment.amount) continue;

      const paymentDate = new Date(payment.createdAt);
      paymentDate.setHours(0, 0, 0, 0);

      if (paymentDate >= startDate && paymentDate <= today) {
        const key = paymentDate.toISOString().split("T")[0];
        dateMap[key].price += Number(payment.amount);
      }
    }

    /* ================================
       Convert to array (sorted)
    ================================= */

    const response = Object.keys(dateMap)
      .sort()
      .map((key) => dateMap[key]);

    return response;
  } catch (err) {
    throw new Error(`DynamoDB 30 Days Payment Summary Error: ${err.message}`);
  }
};

const deletePaymentsByInvoiceId = async (invoiceId) => {
  if (!invoiceId) {
    throw new Error("invoiceId is required to delete payments");
  }

  try {
    /* ================================
       1. Scan payments by invoiceId
    ================================= */

    const scanCommand = new ScanCommand({
      TableName: PAYMENT_TABLE,
      FilterExpression: "invoiceId = :invoiceId",
      ExpressionAttributeValues: {
        ":invoiceId": invoiceId,
      },
    });

    const scanResult = await dynamoDB.send(scanCommand);
    const payments = scanResult.Items || [];

    if (payments.length === 0) {
      return {
        deletedCount: 0,
        message: "No payments found for this invoice",
      };
    }

    /* ================================
       2. Delete each payment
    ================================= */

    const deletePromises = payments.map((payment) =>
      dynamoDB.send(
        new DeleteCommand({
          TableName: PAYMENT_TABLE,
          Key: {
            _id: payment._id,
          },
        })
      )
    );

    await Promise.all(deletePromises);

    return {
      deletedCount: payments.length,
      deletedPaymentIds: payments.map((p) => p._id),
    };
  } catch (err) {
    throw new Error(
      `DynamoDB Delete Payments by Invoice Error: ${err.message}`
    );
  }
};

const getLatestPaymentByInvoiceId = async (invoiceId) => {
  if (!invoiceId) {
    throw new Error("invoiceId is required");
  }

  try {
    /* ================================
       1. Fetch all payments for invoice
    ================================= */

    const command = new ScanCommand({
      TableName: PAYMENT_TABLE,
      FilterExpression: "invoiceId = :invoiceId",
      ExpressionAttributeValues: {
        ":invoiceId": invoiceId,
      },
    });

    const result = await dynamoDB.send(command);
    const payments = result.Items || [];

    if (payments.length === 0) {
      return null; // No payment yet for this invoice
    }

    /* ================================
       2. Sort by createdAt DESC
    ================================= */

    const latestPayment = payments.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )[0];

    return latestPayment;
  } catch (err) {
    throw new Error(`DynamoDB Get Latest Payment Error: ${err.message}`);
  }
};

module.exports = {
  createPayment,
  getAllPayments,
  getLast30DaysPaymentsSummary,
  deletePaymentsByInvoiceId,
  getLatestPaymentByInvoiceId,
};
