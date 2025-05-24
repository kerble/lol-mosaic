const gridWidth = 8;
const gridHeight = 10;
const itemSize = 64; // or whatever your icon size is

let itemData = []; // loaded from item-colors.json
let itemImages = {}; // cache for image elements

// Load item color data from JSON
fetch('item-colors.json')
  .then(res => res.json())
  .then(data => {
    itemData = data;
  });

document.getElementById('imageUploader').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const img = new Image();
  img.onload = () => processImage(img);
  img.src = URL.createObjectURL(file);
});

function processImage(img) {
  const canvas = document.getElementById('sourceCanvas');
  const ctx = canvas.getContext('2d');

  canvas.width = gridWidth;
  canvas.height = gridHeight;

  // Resize uploaded image to 8x10 pixels for processing
  ctx.drawImage(img, 0, 0, gridWidth, gridHeight);

  // Get grid cell average colors
  const colors = [];
  const imageData = ctx.getImageData(0, 0, gridWidth, gridHeight).data;

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const index = (y * gridWidth + x) * 4;
      colors.push({
        r: imageData[index],
        g: imageData[index + 1],
        b: imageData[index + 2]
      });
    }
  }

  // Draw mosaic
  drawMosaic(colors);
}

function colorDistance(c1, c2) {
    return Math.sqrt(
      Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
    );
  }

function findClosestItem(targetColor) {
let closest = null;
let bestDistance = Infinity;

for (const item of itemData) {
// Compare to the average of all four quadrants
const avg = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].reduce((acc, key) => {
    acc.r += item.quadrants[key].r;
    acc.g += item.quadrants[key].g;
    acc.b += item.quadrants[key].b;
    return acc;
}, { r: 0, g: 0, b: 0 });

avg.r /= 4;
avg.g /= 4;
avg.b /= 4;

const dist = colorDistance(targetColor, avg);

if (dist < bestDistance) {
    bestDistance = dist;
    closest = item;
}
}

return closest;
}


function drawMosaic(gridColors) {
    const canvas = document.getElementById('mosaicCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = gridWidth * itemSize;
    canvas.height = gridHeight * itemSize;
  
    gridColors.forEach(async (cellColor, index) => {
      const bestMatch = findClosestItem(cellColor);
      if (!bestMatch) return;
  
      // Cache image if not already
      if (!itemImages[bestMatch.name]) {
        const img = new Image();
        img.src = `assets/${bestMatch.name}`;
        await new Promise(res => {
          img.onload = res;
        });
        itemImages[bestMatch.name] = img;
      }
  
      const img = itemImages[bestMatch.name];
  
      const x = (index % gridWidth) * itemSize;
      const y = Math.floor(index / gridWidth) * itemSize;
      ctx.drawImage(img, x, y, itemSize, itemSize);
    });
  }
  