const itemSize = 64; // or whatever your icon size is
let itemIdMap = {}; // key: filename, value: ID string

let itemData = []; // loaded from item-colors.json
let itemImages = {}; // cache for image elements
let itemFolder = 'assets/all'; // default path

window.addEventListener('DOMContentLoaded', () => {
  const modeSelect = document.getElementById('modeSelect');
  modeSelect.value = 'highres';
  modeSelect.dispatchEvent(new Event('change'));
});

document.getElementById('imageUploader').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const img = new Image();
  img.onload = () => {
    if (itemData.length === 0) {
      console.warn("Item data not loaded yet — mosaic will not render.");
    }
    processImage(img);
  };
  img.src = URL.createObjectURL(file);
});

document.getElementById('modeSelect').addEventListener('change', (e) => {
  currentMode = e.target.value;

  if (currentMode === 'highres') {
    itemFolder = 'assets/all';
    fetch('all-item-colors.json')
      .then(res => res.json())
      .then(data => itemData = data);

    itemIdMap = {}; // Clear it, not used in highres
  } else if (currentMode === 'itemset') {
    itemFolder = 'assets/rift';
    fetch('rift-items.json')
      .then(res => res.json())
      .then(data => itemData = data);
  }

  console.log(`Mode: ${currentMode}, using folder: ${itemFolder}`);
});

function processImage(img) {
  const canvas = document.getElementById('sourceCanvas');
  const ctx = canvas.getContext('2d');

  const mode = document.getElementById("modeSelect").value;
  let gridWidth, gridHeight;

  if (mode === "itemset") {
    gridWidth = 10;
    gridHeight = 7;
  } else {
    const maxGridSize = 128;
    if (img.width >= img.height) {
      gridWidth = maxGridSize;
      gridHeight = Math.max(1, Math.round((img.height / img.width) * maxGridSize));
    } else {
      gridHeight = maxGridSize;
      gridWidth = Math.max(1, Math.round((img.width / img.height) * maxGridSize));
    }
  }

  canvas.width = gridWidth;
  canvas.height = gridHeight;


  // Resize uploaded image to grid size for processing
  ctx.drawImage(img, 0, 0, gridWidth, gridHeight);

  // Get average color for each grid cell
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

  drawMosaic(colors, gridWidth, gridHeight);
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

console.log("Starting drawMosaic...");
let usedItems = new Set(); // ✅ can be reassigned
let usedItemIdStack = [];

console.log("itemData length:", itemData.length);

function drawMosaic(gridColors, gridWidth, gridHeight) {
  usedItems = new Set(); // reset it on each new mosaic
  usedItemIdStack = [];

  if (itemData.length === 0) {
    console.warn("Item data not loaded yet. Aborting mosaic draw.");
    return;
  }

  const canvas = document.getElementById('mosaicCanvas');
  const ctx = canvas.getContext('2d');

  canvas.width = gridWidth * itemSize;
  canvas.height = gridHeight * itemSize;

  gridColors.forEach(async (cellColor, index) => {
    const bestMatch = findClosestItem(cellColor);
    usedItems.add(bestMatch.name);
    console.log("Best match:", bestMatch.name, "| ID:", bestMatch.id);
    if (bestMatch && bestMatch.id) {
      usedItemIdStack.push(bestMatch.id); // ⬅ Push each use, preserving order
    }
    
    
    if (!bestMatch) return;
    
    if (!itemImages[bestMatch.name]) {
      const img = new Image();
      img.src = `${itemFolder}/${bestMatch.name}`;
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
  // console.log("Final usedItemIds:", usedItemIds);
}
  

document.getElementById('exportItemSetBtn').addEventListener('click', () => {
  const canvas = document.getElementById('mosaicCanvas');

  // Enforce 10x7 grid (128 px per tile)
  const expectedWidth = 10 * itemSize;
  const expectedHeight = 7 * itemSize;

  if (canvas.width !== expectedWidth || canvas.height !== expectedHeight) {
    alert("❌ Error: The mosaic must be a 10×7 grid to export as a League item set.\nPlease switch to 'League Item Set (10x7)' mode and regenerate the mosaic.");
    return;
  }
  const itemSet = {
    title: "Mosaic Item Set",
    associatedMaps: [11],
    associatedChampions: [],
    blocks: [
      {
        type: "Mosaic Items",
        items: usedItemIdStack.map(id => ({ id, count: 1 }))
      }
    ]
  };

  const blob = new Blob([JSON.stringify(itemSet, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'item-set.json';
  a.click();

  URL.revokeObjectURL(url);
});


document.getElementById('presetSelect').addEventListener('change', (e) => {
  const preset = e.target.value;
  if (!preset) return;

  fetch(`presets/${preset}.json`)
    .then(res => res.json())
    .then(data => {
      console.log(`✅ Loaded preset "${preset}"`);
      drawMosaic(data.gridColors, data.gridWidth, data.gridHeight);
    })
    .catch(err => {
      console.error(`❌ Failed to load preset "${preset}":`, err);
      alert("Failed to load preset. Please try again.");
    });
});