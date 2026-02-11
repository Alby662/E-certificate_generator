import puppeteer from 'puppeteer';
import fs from 'fs';

console.log('🔍 Checking Puppeteer installation...\n');

async function checkPuppeteer() {
    try {
        console.log('📦 Puppeteer package found');

        console.log('\n🌐 Step 1/5: Attempting to launch browser...');
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        console.log('✅ Browser launched successfully!');
        console.log('   - Is connected:', browser.isConnected());

        const version = await browser.version();
        console.log('   - Browser version:', version);

        console.log('\n📄 Step 2/5: Creating test page...');
        const page = await browser.newPage();
        console.log('✅ Page created successfully!');

        console.log('\n🌍 Step 3/5: Loading test HTML...');
        const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial; padding: 20px; }
          h1 { color: #333; }
        </style>
      </head>
      <body>
        <h1>Puppeteer Test</h1>
        <p>If you can see this, Puppeteer is working correctly!</p>
      </body>
      </html>
    `;
        await page.setContent(testHtml, { waitUntil: 'networkidle0' });
        console.log('✅ HTML loaded successfully!');

        console.log('\n🎨 Step 4/5: Generating test PDF...');
        await page.pdf({
            path: 'test-puppeteer.pdf',
            format: 'A4',
            printBackground: true
        });
        console.log('✅ PDF generated successfully!');

        // Check file was created
        if (fs.existsSync('test-puppeteer.pdf')) {
            const stats = fs.statSync('test-puppeteer.pdf');
            console.log('   - File size:', stats.size, 'bytes');
        }

        console.log('\n🔒 Step 5/5: Cleaning up...');
        await page.close();
        await browser.close();
        console.log('✅ Cleanup complete!');

        console.log('\n✅ ========== ALL PUPPETEER CHECKS PASSED! ==========');
        console.log('📄 Test PDF created: test-puppeteer.pdf');
        console.log('\nYour Puppeteer installation is working correctly.');
        console.log('PDF generation should work for certificates.\n');

    } catch (error) {
        console.error('\n❌ ========== PUPPETEER CHECK FAILED ==========');
        console.error('Error:', error.message);
        console.error('\nStack:', error.stack);

        console.log('\n💡 Possible fixes:');
        console.log('   1. Install Puppeteer Chrome:');
        console.log('      npx puppeteer browsers install chrome');
        console.log('   ');
        console.log('   2. Reinstall Puppeteer:');
        console.log('      npm uninstall puppeteer && npm install puppeteer');
        console.log('   ');
        console.log('   3. Check Node.js version (need 18+):');
        console.log('      node --version');
        console.log('   ');
        console.log('   4. On Linux, install dependencies:');
        console.log('      sudo apt-get install -y libgbm1 libxss1 libasound2');

        process.exit(1);
    }
}

checkPuppeteer();
