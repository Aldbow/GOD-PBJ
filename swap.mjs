import fs from 'fs';

const filePath = 'src/features/epurchasing/components/EPurchasingView.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const blockAStart = content.indexOf('          {/* Filters & Search - Shared across all views */}');
const blockAEnd = content.indexOf('          {/* Summary Cards - Clean Modern Redesign */}');
const blockBStart = blockAEnd;
const blockBEnd = content.indexOf('          {/* Dynamic Render based on ViewMode */}');

if (blockAStart === -1 || blockAEnd === -1 || blockBEnd === -1) {
  console.error("Could not find boundaries!");
  process.exit(1);
}

const blockA = content.substring(blockAStart, blockAEnd);
const blockB = content.substring(blockBStart, blockBEnd);

const newContent = content.substring(0, blockAStart) + blockB + blockA + content.substring(blockBEnd);

fs.writeFileSync(filePath, newContent);
console.log("Successfully swapped blocks safely!");
