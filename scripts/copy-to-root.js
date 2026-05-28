import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = join(__dirname, '..');
const pluginDir = join(rootDir, 'packages', 'obsidian-halo-plus');

const filesToCopy = [
  { src: 'manifest.json', dest: 'manifest.json' },
  { src: 'dist/main.js', dest: 'main.js' },
  { src: 'styles.css', dest: 'styles.css' },
  { src: 'versions.json', dest: 'versions.json' },
];

for (const file of filesToCopy) {
  const srcPath = join(pluginDir, file.src);
  const destPath = join(rootDir, file.dest);
  
  if (existsSync(srcPath)) {
    copyFileSync(srcPath, destPath);
    console.log(`Copied ${file.src} to ${file.dest}`);
  } else {
    console.warn(`Warning: ${file.src} not found`);
  }
}