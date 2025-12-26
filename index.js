const dotenv = require("dotenv");
const express = require("express");
const serverless = require("serverless-http");

dotenv.config();

const app = require("./src/app");

const handler = serverless(app);

console.log("✅ AWS DynamoDB configuration loaded.");

// Export the Lambda handler
module.exports.handler = handler;
