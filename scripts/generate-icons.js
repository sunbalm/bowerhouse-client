const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const outputDir = path.join(__dirname, "../src/icons");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function svg(size) {
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" rx="112" fill="#061c14"/>
    <rect x="42" y="42" width="428" height="428" rx="88" fill="#0b2419" stroke="#d4af37" stroke-width="22"/>
    <circle cx="160" cy="132" r="48" fill="#fff0a6" opacity="0.18"/>
    <text x="256" y="328" text-anchor="middle" font-family="Georgia, serif" font-size="230" font-weight="900" fill="#fff0a6">J</text>
    <text x="256" y="402" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="900" fill="#d4af37">BOWER</text>
  </svg>`;
}

async function generate() {
  for (const size of sizes) {
    await sharp(Buffer.from(svg(size)))
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, `icon-${size}.png`));
  }

  console.log("BowerHouse icons generated.");
}

generate().catch((error) => {
  console.error(error);
  process.exit(1);
});