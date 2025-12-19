const puppeteer = require("puppeteer");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const InvoiceTemplate = require("../templates/InvoiceTemplate.js");

async function generateInvoicePDF(invoice) {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(InvoiceTemplate, { invoice })
  );

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--allow-file-access-from-files",
    ],
  });

  const page = await browser.newPage();

  await page.setContent(`<!DOCTYPE html>${html}`, {
    waitUntil: "networkidle0",
    url: "file:///",
  });
  await page.screenshot({ path: "debug.png", fullPage: true });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "20mm",
      bottom: "20mm",
      left: "15mm",
      right: "15mm",
    },
  });

  await browser.close();
  return pdfBuffer;
}

module.exports = generateInvoicePDF;
