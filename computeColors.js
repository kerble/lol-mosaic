// This script computes the average RGB values of the four quadrants of each image in the assets directory
// and saves the results to a JSON file. It uses the sharp library for image processing.
// This script is intended to be run in a Node.js environment.
// It reads all PNG files from the 'assets' directory, processes each image to compute the average RGB values
// of its four quadrants, and saves the results in a JSON file named 'item-colors.json'.


const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const assetsDir = path.join(__dirname, 'assets');
const outputFile = path.join(__dirname, 'item-colors.json');

async function computeAverageRGB(data) {
    let r = 0, g = 0, b = 0;
    const pixelCount = data.length / 4;
  
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];     // R
      g += data[i + 1]; // G
      b += data[i + 2]; // B
    }
  
    return {
      r: Math.round(r / pixelCount),
      g: Math.round(g / pixelCount),
      b: Math.round(b / pixelCount),
    };
  }

async function getQuadrantAverages(filePath) {
    const baseImage = sharp(filePath).ensureAlpha(); // ensures RGBA format
    const { width, height } = await baseImage.metadata();
  
    const halfWidth = Math.floor(width / 2);
    const halfHeight = Math.floor(height / 2);
  
    // Extract quadrants safely
    const quadrants = {
      topLeft:     baseImage.clone().extract({ left: 0, top: 0, width: halfWidth, height: halfHeight }),
      topRight:    baseImage.clone().extract({ left: halfWidth, top: 0, width: width - halfWidth, height: halfHeight }),
      bottomLeft:  baseImage.clone().extract({ left: 0, top: halfHeight, width: halfWidth, height: height - halfHeight }),
      bottomRight: baseImage.clone().extract({ left: halfWidth, top: halfHeight, width: width - halfWidth, height: height - halfHeight }),
    };
  
    const result = {};
  
    for (const [key, quadrant] of Object.entries(quadrants)) {
      const buffer = await quadrant.raw().toBuffer();
      result[key] = await computeAverageRGB(buffer);
    }
  
    return result;
  }

async function main() {
    const files = fs.readdirSync(assetsDir).filter(file => file.endsWith('.png'));
    const output = [];
  
    for (const file of files) {
      const filePath = path.join(assetsDir, file);
  
      try {
        const image = sharp(filePath);
        const { width, height } = await image.metadata();
  
        if (!width || !height || width < 2 || height < 2) {
          console.warn(`⚠️ Skipping ${file} — invalid dimensions (${width}x${height})`);
          continue;
        }
  
        const quadrants = await getQuadrantAverages(filePath);
        output.push({ name: file, quadrants });
        console.log(`✅ Processed: ${file}`);
      } catch (err) {
        console.warn(`❌ Skipping ${file} due to error:`, err.message);
      }
    }
  
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.log(`\n📦 Saved data to ${outputFile}`);
  }
  

main().catch(err => {
  console.error("❌ Error processing images:", err);
});
