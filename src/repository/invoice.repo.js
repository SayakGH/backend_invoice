const {
  GetCommand,
  PutCommand,
  ScanCommand,
  DeleteCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const generateInvoiceId = require("../utils/generateInvoiceId");
const { dynamoDB } = require("../config/dynamo");

const TABLE_NAME = "Invoice_app_invoices";

const createInvoice = async (invoiceData) => {
  const newId = generateInvoiceId();

  // Convert to IST
  const now = new Date();
  const istDate = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

  const newInvoice = {
    _id: newId,
    createdAt: istDate.toISOString(),
    ...invoiceData,
  };

  const params = {
    TableName: TABLE_NAME,
    Item: newInvoice,
    ConditionExpression: "attribute_not_exists(#id)",
    ExpressionAttributeNames: {
      "#id": "_id",
    },
  };

  try {
    const command = new PutCommand(params);
    await dynamoDB.send(command);
    return newInvoice;
  } catch (err) {
    throw new Error(`DynamoDB Create Error: ${err.message}`);
  }
};

const getInvoicesByExecutiveName = async (executiveName) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: "executiveName = :executive",
      ExpressionAttributeValues: {
        ":executive": executiveName,
      },
    };

    const result = await dynamoDB.send(new ScanCommand(params));
    const invoices = result.Items || [];

    const referencedIds = new Set();

    // Collect all previousInvoiceIds inside this executive scope
    for (const inv of invoices) {
      if (inv.previousInvoiceId) {
        referencedIds.add(inv.previousInvoiceId);
      }
    }

    // Latest = those NOT referenced by any previousInvoiceId
    const latestInvoices = invoices.filter(
      (inv) => !referencedIds.has(inv._id),
    );

    // Sort newest first
    latestInvoices.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );

    return latestInvoices;
  } catch (err) {
    throw new Error(`DynamoDB Fetch Executive Invoices Error: ${err.message}`);
  }
};

const getAllInvoices = async () => {
  try {
    const params = { TableName: TABLE_NAME };
    const result = await dynamoDB.send(new ScanCommand(params));

    const invoices = result.Items || [];

    const allIds = new Set();
    const referencedIds = new Set();

    // Collect all invoice IDs and all previousInvoiceIds
    for (const inv of invoices) {
      allIds.add(inv._id);

      if (inv.previousInvoiceId) {
        referencedIds.add(inv.previousInvoiceId);
      }
    }

    // Latest invoices = invoices NOT referenced by any previousInvoiceId
    const latestInvoices = invoices.filter(
      (inv) => !referencedIds.has(inv._id),
    );

    // Sort by latest creation time DESC (nice for UI)
    latestInvoices.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );

    return latestInvoices;
  } catch (err) {
    throw new Error(`Latest Invoice Fetch Error: ${err.message}`);
  }
};

const updateInvoicePayment = async (
  invoiceId,
  amount,
  paymentMode,
  chequeNumber,
  bankName,
) => {
  try {
    /* 1️⃣ Fetch original invoice */
    const getParams = {
      TableName: TABLE_NAME,
      Key: { _id: invoiceId },
    };

    const original = await dynamoDB.send(new GetCommand(getParams));

    if (!original.Item) {
      throw new Error("Invoice not found");
    }

    const oldInvoice = original.Item;

    /* 2️⃣ Validate payment */
    if (amount <= 0) {
      throw new Error("Invalid payment amount");
    }

    if (amount > oldInvoice.remainingAmount) {
      throw new Error("Payment exceeds remaining amount");
    }

    /* 3️⃣ Create new version */
    const newInvoiceId = generateInvoiceId();

    const now = new Date();
    const istDate = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

    const newInvoice = {
      ...oldInvoice,
      _id: newInvoiceId,
      createdAt: istDate.toISOString(),
      previousInvoiceId: oldInvoice._id,
      gst: {
        amount: (amount * oldInvoice.gst.percentage) / 100,
        percentage: oldInvoice.gst.percentage,
      },
      advance: (oldInvoice.advance || 0) + amount,

      remainingAmount:
        oldInvoice.subTotal -
        (oldInvoice.advance || 0) -
        amount +
        (amount * oldInvoice.gst.percentage) / 100,
      lastPaymentAmount: amount,
      lastPaymentDate: istDate.toISOString(),
      version: (oldInvoice.version || 1) + 1,
      payment: {
        mode: paymentMode,
        chequeNumber: paymentMode === "Cheque" ? chequeNumber : null,
        bankName: paymentMode === "Cheque" ? bankName : null,
      },
      isOriginal: false,
    };

    /* 4️⃣ Save new invoice */
    const putParams = {
      TableName: TABLE_NAME,
      Item: newInvoice,
      ConditionExpression: "attribute_not_exists(#id)",
      ExpressionAttributeNames: { "#id": "_id" },
    };

    await dynamoDB.send(new PutCommand(putParams));

    /* 5️⃣ Return new invoice */
    return newInvoice;
  } catch (err) {
    throw new Error(`Invoice Payment Error: ${err.message}`);
  }
};

const getInvoiceById = async (id) => {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      _id: id,
    },
  };

  try {
    const command = new GetCommand(params);
    const result = await dynamoDB.send(command);

    // If no item exists, return null
    return result.Item || null;
  } catch (err) {
    throw new Error(`DynamoDB Get Error: ${err.message}`);
  }
};

const deleteInvoiceById = async (id) => {
  if (!id) {
    throw new Error("Invoice ID is required");
  }

  const params = {
    TableName: TABLE_NAME,
    Key: {
      _id: id,
    },
    ConditionExpression: "attribute_exists(#id)",
    ExpressionAttributeNames: {
      "#id": "_id",
    },
    ReturnValues: "ALL_OLD",
  };

  try {
    const command = new DeleteCommand(params);
    const result = await dynamoDB.send(command);

    return {
      message: "Invoice deleted successfully",
      deletedInvoice: result.Attributes,
    };
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      throw new Error("Invoice not found");
    }

    throw new Error(`DynamoDB Delete Invoice Error: ${err.message}`);
  }
};
const getPreviousInvoiceHistory = async (latestInvoiceId) => {
  try {
    const params = { TableName: TABLE_NAME };
    const result = await dynamoDB.send(new ScanCommand(params));

    const invoices = result.Items || [];

    // Build lookup map
    const map = {};
    for (const inv of invoices) {
      map[inv._id] = inv;
    }

    const history = [];
    let current = map[latestInvoiceId];

    if (!current || !current.previousInvoiceId) {
      return [];
    }

    let prevId = current.previousInvoiceId;

    while (prevId) {
      const inv = map[prevId];
      if (!inv) break;

      history.push(inv);
      prevId = inv.previousInvoiceId;
    }

    return history;
  } catch (err) {
    throw new Error(`Invoice History Error: ${err.message}`);
  }
};

const analytics = async () => {
  try {
    const params = {
      TableName: TABLE_NAME,

      ProjectionExpression: "#id, previousInvoiceId, advance, remainingAmount",

      ExpressionAttributeNames: {
        "#id": "_id",
      },
    };

    const result = await dynamoDB.send(new ScanCommand(params));
    const invoices = result.Items || [];

    const referencedIds = new Set();

    // Collect all previousInvoiceIds
    for (const inv of invoices) {
      if (inv.previousInvoiceId) {
        referencedIds.add(inv.previousInvoiceId);
      }
    }

    // Latest invoices only
    const latestInvoices = invoices.filter(
      (inv) => !referencedIds.has(inv._id),
    );

    let totalPaid = 0;
    let totalDue = 0;

    for (const inv of latestInvoices) {
      totalPaid += Number(inv.advance || 0);
      totalDue += Number(inv.remainingAmount || 0);
    }

    return {
      totalInvoices: latestInvoices.length,
      totalPaid,
      totalDue,
    };
  } catch (err) {
    throw new Error(`DynamoDB Analytics Error: ${err.message}`);
  }
};
const isLatestInvoice = async (invoiceId) => {
  const params = { TableName: TABLE_NAME };
  const result = await dynamoDB.send(new ScanCommand(params));

  const invoices = result.Items || [];

  // If any invoice points to this one as previous → not latest
  return !invoices.some((inv) => inv.previousInvoiceId === invoiceId);
};
const updateInvoiceCustomerPhone = async (invoiceId, newPhone) => {
  try {
    if (!newPhone) throw new Error("Phone is required");

    const latest = await isLatestInvoice(invoiceId);
    if (!latest) {
      throw new Error("Cannot update phone on an old invoice version");
    }

    const params = {
      TableName: TABLE_NAME,
      Key: { _id: invoiceId },
      UpdateExpression: "SET #c.#phone = :phone",
      ExpressionAttributeNames: {
        "#c": "customer",
        "#phone": "phone",
      },
      ExpressionAttributeValues: {
        ":phone": String(newPhone),
      },
      ReturnValues: "ALL_NEW",
    };

    const result = await dynamoDB.send(new UpdateCommand(params));
    return result.Attributes;
  } catch (err) {
    throw new Error(`Update Phone Error: ${err.message}`);
  }
};
const updateInvoiceCustomerPAN = async (invoiceId, newPAN) => {
  try {
    if (!newPAN) throw new Error("PAN is required");

    const latest = await isLatestInvoice(invoiceId);
    if (!latest) {
      throw new Error("Cannot update PAN on an old invoice version");
    }

    const params = {
      TableName: TABLE_NAME,
      Key: { _id: invoiceId },
      UpdateExpression: "SET #c.#PAN = :pan",
      ExpressionAttributeNames: {
        "#c": "customer",
        "#PAN": "PAN",
      },
      ExpressionAttributeValues: {
        ":pan": newPAN.toUpperCase(),
      },
      ReturnValues: "ALL_NEW",
    };

    const result = await dynamoDB.send(new UpdateCommand(params));
    return result.Attributes;
  } catch (err) {
    throw new Error(`Update PAN Error: ${err.message}`);
  }
};

const getFullInvoiceChain = async (latestInvoiceId) => {
  try {
    const params = { TableName: TABLE_NAME };
    const result = await dynamoDB.send(new ScanCommand(params));

    const invoices = result.Items || [];

    // Build lookup map
    const map = {};
    for (const inv of invoices) {
      map[inv._id] = inv;
    }

    const chain = [];

    let current = map[latestInvoiceId];
    if (!current) return [];

    // include latest first
    chain.push(current);

    let prevId = current.previousInvoiceId;

    while (prevId) {
      const inv = map[prevId];
      if (!inv) break;

      chain.push(inv);
      prevId = inv.previousInvoiceId;
    }

    return chain;
  } catch (err) {
    throw new Error(`Invoice Chain Fetch Error: ${err.message}`);
  }
};

module.exports = {
  createInvoice,
  getFullInvoiceChain,
  getAllInvoices,
  updateInvoicePayment,
  getInvoiceById,
  deleteInvoiceById,
  getInvoicesByExecutiveName,
  getPreviousInvoiceHistory,
  analytics,
  updateInvoiceCustomerPhone,
  updateInvoiceCustomerPAN,
};
