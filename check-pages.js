const fs = require('fs');
const path = require('path');

const imgDir = 'C:\\Users\\sompa\\Downloads\\Ensis-2';
const crmAppDir = 'C:\\Users\\sompa\\Desktop\\namo-gange\\ensis_crm\\src\\app';
const crmFeaturesDir = 'C:\\Users\\sompa\\Desktop\\namo-gange\\ensis_crm\\src\\features';

// Get all images
function getFiles(dir, files = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      getFiles(full, files);
    } else if (item.name.endsWith('.png')) {
      files.push({ name: item.name, folder: path.basename(dir), full });
    }
  }
  return files;
}

// Get all page.tsx in ensis_crm
function getPages(dir, pages = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      getPages(full, pages);
    } else if (item.name === 'page.tsx') {
      const rel = path.relative(crmAppDir, full).replace(/\\/g, '/');
      pages.push({ rel, full });
    }
  }
  return pages;
}

// Get all feature components (modals, drawers, components)
function getFeatureFiles(dir, files = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      getFeatureFiles(full, files);
    } else if (item.name.endsWith('.tsx') || item.name.endsWith('.ts')) {
      files.push({ name: item.name, rel: path.relative(crmFeaturesDir, full).replace(/\\/g, '/') });
    }
  }
  return files;
}

const images = getFiles(imgDir).sort((a, b) => a.name.localeCompare(b.name));
const pages = getPages(crmAppDir);
const featureFiles = getFeatureFiles(crmFeaturesDir);

console.log(`Total images found: ${images.length}`);
console.log(`Total page.tsx found: ${pages.length}`);

fs.writeFileSync('C:\\Users\\sompa\\.gemini\\antigravity\\brain\\e983db7c-0ac1-4a3e-a6d8-7c1b66730411\\scratch\\pages-list.json', JSON.stringify(pages, null, 2));
fs.writeFileSync('C:\\Users\\sompa\\.gemini\\antigravity\\brain\\e983db7c-0ac1-4a3e-a6d8-7c1b66730411\\scratch\\features-list.json', JSON.stringify(featureFiles, null, 2));
fs.writeFileSync('C:\\Users\\sompa\\.gemini\\antigravity\\brain\\e983db7c-0ac1-4a3e-a6d8-7c1b66730411\\scratch\\images-list.json', JSON.stringify(images, null, 2));
console.log('Lists written successfully');

