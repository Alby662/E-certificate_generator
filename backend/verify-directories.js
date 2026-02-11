import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const requiredDirs = [
    'uploads',
    'uploads/templates',
    'uploads/excel',
    'uploads/certificates',
    'uploads/previews'
];

console.log('🔍 Verifying directory structure...\n');

let allExist = true;

requiredDirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    const exists = fs.existsSync(fullPath);

    if (exists) {
        console.log(`✅ ${dir} - EXISTS`);
        // Show file count
        const files = fs.readdirSync(fullPath);
        console.log(`   (${files.length} items)`);
    } else {
        console.log(`❌ ${dir} - MISSING (creating now...)`);
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`   ✅ Created: ${dir}`);
        allExist = false;
    }
});

if (allExist) {
    console.log('\n✅ All directories exist!');
} else {
    console.log('\n⚠️  Some directories were missing but have been created.');
}

console.log('\n📂 Current directory structure:');
console.log('uploads/');
requiredDirs.slice(1).forEach(dir => {
    const relativePath = dir.replace('uploads/', '  ');
    const fullPath = path.join(__dirname, dir);
    if (fs.existsSync(fullPath)) {
        const files = fs.readdirSync(fullPath);
        console.log(`${relativePath}/ (${files.length} files)`);
    }
});

console.log('\n✅ Directory verification complete!');
