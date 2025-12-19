const React = require("react");
const { getCompanyLogoBase64 } = require("../assests/companyLogos");

/* ===============================
   Utils
================================ */

const formatCurrency = (amount) =>
  `₹ ${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (date) => new Date(date).toLocaleDateString("en-IN");

/* ===============================
   Helper Row
================================ */

const SummaryRow = ({ label, value }) =>
  React.createElement(
    "div",
    {
      style: {
        display: "flex",
        justifyContent: "space-between",
        padding: "2px 0",
      },
    },
    React.createElement("span", null, label),
    React.createElement("span", null, formatCurrency(value))
  );

/* ===============================
   Invoice Template (CommonJS)
================================ */

const InvoiceTemplate = ({ invoice }) => {
  const {
    _id,
    createdAt,
    company,
    customer,
    items,
    charges,
    gst,
    itemsTotal,
    subTotal,
    totalAmount,
    advance,
    remainingAmount,
    payment,
  } = invoice;

  const logoBase64 = getCompanyLogoBase64(company.name);
  return React.createElement(
    "html",
    null,

    /* ================= HEAD ================= */
    React.createElement(
      "head",
      null,
      React.createElement("meta", { charSet: "utf-8" }),
      React.createElement(
        "style",
        null,
        `
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; margin: 0; background: #fff; }

        .invoice {
          max-width: 880px;
          margin: auto;
          padding: 20px;
          font-size: 11.5px;
          line-height: 1.3;
          color: #000;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
        }

        th, td {
          border: 1px solid #000;
          padding: 6px 7px;
          font-size: 11px;
        }

        th {
          background: #2c3e50;
          color: #fff;
        }
      `
      )
    ),

    /* ================= BODY ================= */
    React.createElement(
      "body",
      null,
      React.createElement(
        "div",
        { className: "invoice" },

        /* ================= HEADER ================= */
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            },
          },

          React.createElement(
            "div",
            { style: { display: "flex", gap: 12, alignItems: "center" } },

            logoBase64 &&
              React.createElement("img", {
                src: logoBase64,
                style: { width: 60, height: "auto" },
              }),

            React.createElement(
              "div",
              null,
              React.createElement("strong", null, company.name),
              React.createElement("div", null, company.address),
              React.createElement("div", null, `Phone: ${company.phone}`),
              React.createElement("div", null, `Email: ${company.email}`)
            )
          ),

          React.createElement(
            "div",
            { style: { textAlign: "right" } },
            React.createElement(
              "h2",
              { style: { margin: 0, fontSize: 15 } },
              "TAX INVOICE"
            ),
            React.createElement("div", null, `Invoice No: ${_id}`),
            React.createElement("div", null, `Date: ${formatDate(createdAt)}`)
          )
        ),

        /* ================= BILL TO ================= */
        React.createElement(
          "div",
          { style: { padding: 8, marginTop: 10 } },
          React.createElement("strong", null, "BILL TO:"),
          React.createElement("br"),
          customer.name,
          React.createElement("br"),
          customer.address,
          React.createElement("br"),
          `Phone: ${customer.phone}`,
          customer.PAN ? ` | PAN: ${customer.PAN}` : "",
          customer.GSTIN ? ` | GSTIN: ${customer.GSTIN}` : ""
        ),

        /* ================= ITEMS TABLE ================= */
        React.createElement(
          "table",
          null,

          React.createElement(
            "thead",
            null,
            React.createElement(
              "tr",
              null,
              [
                "Description",
                "Project",
                "Code",
                "Area",
                "Rate (₹)",
                "Amount (₹)",
              ].map((h, i) =>
                React.createElement(
                  "th",
                  { key: i, style: i >= 3 ? { textAlign: "right" } : {} },
                  h
                )
              )
            )
          ),

          React.createElement(
            "tbody",
            null,
            items.map((item, idx) =>
              React.createElement(
                "tr",
                { key: idx },
                React.createElement("td", null, item.description),
                React.createElement("td", null, item.projectName),
                React.createElement("td", null, item.hashingCode),
                React.createElement(
                  "td",
                  { style: { textAlign: "right" } },
                  item.areaSqFt.toLocaleString("en-IN")
                ),
                React.createElement(
                  "td",
                  { style: { textAlign: "right" } },
                  formatCurrency(item.rate)
                ),
                React.createElement(
                  "td",
                  { style: { textAlign: "right" } },
                  formatCurrency(item.rate * item.areaSqFt)
                )
              )
            )
          )
        ),

        /* ================= SUMMARY ================= */
        React.createElement(
          "div",
          { style: { width: "40%", marginLeft: "auto", marginTop: 8 } },
          React.createElement(SummaryRow, {
            label: "Items Total",
            value: itemsTotal,
          }),
          charges.parking > 0 &&
            React.createElement(SummaryRow, {
              label: "Parking",
              value: charges.parking,
            }),
          charges.amenities > 0 &&
            React.createElement(SummaryRow, {
              label: "Amenities",
              value: charges.amenities,
            }),
          charges.otherCharges > 0 &&
            React.createElement(SummaryRow, {
              label: "Other",
              value: charges.otherCharges,
            }),
          React.createElement(SummaryRow, {
            label: "Sub Total",
            value: subTotal,
          }),
          React.createElement(SummaryRow, {
            label: `GST ${gst.percentage}%`,
            value: gst.amount,
          }),

          React.createElement(
            "div",
            {
              style: {
                background: "#2c3e50",
                color: "#fff",
                padding: "5px 7px",
                margin: "5px 0",
                fontWeight: "bold",
                display: "flex",
                justifyContent: "space-between",
              },
            },
            React.createElement("span", null, "TOTAL"),
            React.createElement("span", null, formatCurrency(totalAmount))
          ),

          advance > 0 &&
            React.createElement(SummaryRow, {
              label: "Advance",
              value: advance,
            }),

          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "space-between",
                fontWeight: "bold",
              },
            },
            React.createElement("span", null, "Balance"),
            React.createElement("span", null, formatCurrency(remainingAmount))
          )
        ),

        /* ================= PAYMENT ================= */
        React.createElement(
          "div",
          { style: { marginTop: 8 } },
          React.createElement("strong", null, "Payment: "),
          payment.mode
        ),

        /* ================= FOOTER ================= */
        React.createElement(
          "div",
          { style: { display: "flex", gap: 24, marginTop: 18 } },

          React.createElement(
            "div",
            null,
            React.createElement("strong", null, "Bank"),
            React.createElement("br"),
            "HDFC Bank",
            React.createElement("br"),
            "A/C: 50200012345678",
            React.createElement("br"),
            "IFSC: HDFC0001234"
          ),

          React.createElement(
            "div",
            null,
            React.createElement("strong", null, "Terms"),
            React.createElement(
              "ul",
              null,
              [
                "Payment as agreed",
                "Cheque subject to realization",
                "Kolkata jurisdiction",
                "GST applicable",
              ].map((t, i) => React.createElement("li", { key: i }, t))
            )
          )
        ),

        /* ================= SIGNATURE ================= */
        React.createElement(
          "div",
          { style: { marginTop: 30, textAlign: "right" } },
          `For ${company.name}`,
          React.createElement("div", {
            style: {
              width: 150,
              borderTop: "1px solid #000",
              marginLeft: "auto",
              marginTop: 18,
            },
          }),
          "Authorized Signatory"
        )
      )
    )
  );
};

module.exports = InvoiceTemplate;
