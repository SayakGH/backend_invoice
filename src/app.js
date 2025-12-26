const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const analyticsRoutes = require("./routes/analyticsRoute");
const paymentRoutes = require("./routes/paymentRoute");
require("dotenv").config();

const app = express();

app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/invoices", invoiceRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/payments", paymentRoutes);

module.exports = app;
