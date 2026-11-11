import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

async function generateGameZip() {
  const zip = new AdmZip();
  const gameDir = path.join(process.cwd(), 'public', 'cobraracing3d');
  
  // Files to include
  const files = [
    'index.html',
    'game.js',
    'three.min.js',
    'metadata.json'
  ];

  for (const file of files) {
    const filePath = path.join(gameDir, file);
    if (fs.existsSync(filePath)) {
      zip.addLocalFile(filePath);
    } else {
      console.error(`File not found: ${filePath}`);
    }
  }

  const outputPath = path.join(process.cwd(), 'public', 'cobra-racing-3d.zip');
  zip.writeZip(outputPath);
  console.log(`Cobra Racing 3D ZIP generated at: ${outputPath}`);
}

generateGameZip();
