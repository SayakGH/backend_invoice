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

  const now = new Date();
  const istDate = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

  const newInvoice = {
    _id: newId,
    createdAt: istDate.toISOString(), // IST stored
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

const getAllInvoices = async ({ limit = 10, cursor = null }) => {
  const params = {
    TableName: TABLE_NAME,
    Limit: limit,
  };

  // If cursor exists, decode and set ExclusiveStartKey
  if (cursor) {
    params.ExclusiveStartKey = JSON.parse(
      Buffer.from(cursor, "base64").toString("utf-8")
    );
  }

  try {
    const command = new ScanCommand(params);
    const result = await dynamoDB.send(command);

    // Sort latest first (DESC)
    const invoices = (result.Items || []).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return {
      invoices,
      nextCursor: result.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
            "base64"
          )
        : null,
    };
  } catch (err) {
    throw new Error(`DynamoDB Fetch Error: ${err.message}`);
  }
};

const updateInvoicePayment = async (id, amount) => {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      _id: id,
    },

    UpdateExpression: `
      SET 
        advance = if_not_exists(advance, :zero) + :amount,
        remainingAmount = remainingAmount - :amount
    `,

    ConditionExpression: "attribute_exists(#id)",

    ExpressionAttributeNames: {
      "#id": "_id",
    },

    ExpressionAttributeValues: {
      ":amount": amount,
      ":zero": 0,
    },

    ReturnValues: "ALL_NEW",
  };

  try {
    const command = new UpdateCommand(params);
    const result = await dynamoDB.send(command);
    return result.Attributes;
  } catch (err) {
    throw new Error(`DynamoDB Update Error: ${err.message}`);
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

module.exports = {
  createInvoice,
  getAllInvoices,
  updateInvoicePayment,
  getInvoiceById,
};
