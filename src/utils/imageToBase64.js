const fs = require("fs");
const path = require("path");

function imageToBase64(imagePath) {
  if (!fs.existsSync(imagePath)) {
    console.warn("Logo not found:", imagePath);
    return null;
  }

  const ext = path.extname(imagePath).replace(".", "");
  const buffer = fs.readFileSync(imagePath);
  const base64 = buffer.toString("base64");

  return `data:image/${ext};base64,${base64}`;
}

module.exports = imageToBase64;
