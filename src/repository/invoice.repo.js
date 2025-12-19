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
  const newInvoice = {
    _id: newId,
    createdAt: new Date().toISOString(),
    ...invoiceData,
  };

  const params = {
    TableName: TABLE_NAME,
    Item: newInvoice,
    // "attribute_not_exists" ensures we don't overwrite an ID.
    // We use #id alias because _id contains special char in some contexts
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

const getAllInvoices = async () => {
  const params = {
    TableName: TABLE_NAME,
  };

  try {
    const command = new ScanCommand(params);
    const result = await dynamoDB.send(command);

    // Sort by createdAt DESC (latest first)
    const sortedInvoices = (result.Items || []).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return sortedInvoices;
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
