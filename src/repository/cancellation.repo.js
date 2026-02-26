const { QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { dynamoDB } = require("../config/dynamo");

const TABLE_NAME = "cancellation_app_voucher";

exports.hasCancellationForInvoice = async (invoiceId) => {
  try {
    const response = await dynamoDB.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "inv_id-index",
        KeyConditionExpression: "inv_id = :invId",
        ExpressionAttributeValues: {
          ":invId": invoiceId,
        },
        ProjectionExpression: "#id",
        ExpressionAttributeNames: {
          "#id": "_id",
        },
        Limit: 1,
      }),
    );

    return (response.Items || []).length > 0;
  } catch (err) {
    throw new Error(`Check Cancellation Exists (GSI) Error: ${err.message}`);
  }
};
