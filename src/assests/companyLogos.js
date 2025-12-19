const path = require("path");
const imageToBase64 = require("../utils/imageToBase64");

const ASSETS_DIR = path.resolve(__dirname);

const logoMap = {
  "airde real estate": "airde.png",
  "airde developers": "airde.png",
  "sora realtor": "sora-realtor.png",
  "unique realcon": "unique-realcon.png",
};

function getCompanyLogoBase64(companyName) {
  const file = logoMap[companyName.toLowerCase()] || "default.png";

  const fullPath = path.join(ASSETS_DIR, file);
  return imageToBase64(fullPath);
}

module.exports = { getCompanyLogoBase64 };
