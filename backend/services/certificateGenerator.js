import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import sizeOf from 'image-size'; // NEW: Read native template dimensions
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SINGLETON PATTERN: Reuse browser instance across all certificate generations
let browserInstance = null;

/**
 * Get or create browser instance
 * This prevents launching a new browser for every certificate
 */
const getBrowser = async () => {
  // Check if instance exists and is still connected
  if (browserInstance && browserInstance.isConnected()) {
    console.log('[Puppeteer] Reusing existing browser instance');
    return browserInstance;
  }

  // Clear stale instance
  if (browserInstance) {
    console.log('[Puppeteer] Clearing disconnected browser instance');
    browserInstance = null;
  }

  console.log('[Puppeteer] Launching new browser instance...');
  browserInstance = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',  // Prevent memory issues
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ],
  });

  // Handle browser disconnect gracefully
  browserInstance.on('disconnected', () => {
    console.log('[Puppeteer] Browser disconnected, clearing instance');
    browserInstance = null;
  });

  return browserInstance;
};

/**
 * Graceful shutdown handler
 */
export const closeBrowser = async () => {
  if (browserInstance) {
    console.log('[Puppeteer] Closing browser instance...');
    await browserInstance.close();
    browserInstance = null;
  }
};

export const generateCertificate = async (participant, templatePath, outputPath, fields) => {
  console.log('\n🎬 ========== CERTIFICATE GENERATION START ==========');
  console.log('📊 Input Parameters:');
  console.log('   - Participant:', participant?.name || 'Unknown');
  console.log('   - Template Path:', templatePath);
  console.log('   - Output Path:', outputPath);
  console.log('   - Fields Count:', fields?.length || 0);

  let page = null;

  try {
    // Step 1: Get Browser
    console.log('\n🌐 [Step 1/13] Getting browser instance...');
    const browser = await getBrowser();
    console.log('   ✅ Browser instance obtained');
    console.log('   - Browser connected:', browser.isConnected());

    // Step 2: Create New Page
    console.log('\n📄 [Step 2/13] Creating new page...');
    page = await browser.newPage();
    console.log('   ✅ New page created');

    // Step 3: Resolve Template Path
    console.log('\n🔍 [Step 3/13] Resolving template path...');
    const absoluteTemplatePath = path.isAbsolute(templatePath)
      ? templatePath
      : path.join(process.cwd(), templatePath);
    console.log('   - Absolute path:', absoluteTemplatePath);
    console.log('   - File exists:', fs.existsSync(absoluteTemplatePath));

    if (!fs.existsSync(absoluteTemplatePath)) {
      throw new Error(`Template file not found at: ${absoluteTemplatePath}`);
    }
    console.log('   ✅ Template path resolved and verified');

    // Step 4: Read Template Dimensions
    console.log('\n📐 [Step 4/13] Reading template dimensions...');
    const templateBuffer = fs.readFileSync(absoluteTemplatePath);
    const dimensions = sizeOf(templateBuffer);
    const { width, height } = dimensions;
    console.log('   - Width:', width, 'px');
    console.log('   - Height:', height, 'px');
    console.log('   - Type:', dimensions.type);
    console.log('   ✅ Template dimensions read successfully');

    // Step 5: Detect MIME Type
    console.log('\n🎨 [Step 5/13] Detecting image type...');
    const ext = path.extname(absoluteTemplatePath).toLowerCase();
    let mimeType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    console.log('   - Extension:', ext);
    console.log('   - MIME type:', mimeType);
    console.log('   ✅ Image type detected');

    // Step 6: Convert Image to Base64
    console.log('\n🔄 [Step 6/13] Converting image to base64...');
    const imageBitmap = fs.readFileSync(absoluteTemplatePath);
    const imageBase64 = Buffer.from(imageBitmap).toString('base64');
    const imageSrc = `data:${mimeType};base64,${imageBase64}`;
    console.log('   - Image size:', imageBitmap.length, 'bytes');
    console.log('   - Base64 length:', imageBase64.length, 'characters');
    console.log('   ✅ Image converted to base64');

    // Step 7: Generate CSS for Fields
    console.log('\n📝 [Step 7/13] Generating CSS for fields...');
    const fieldsCss = fields ? fields.map(f => `
      #field_${f.id} {
        position: absolute;
        left: ${f.x * width}px;
        top: ${f.y * height}px;
        transform: translateX(-${f.align === 'center' ? '50%' : f.align === 'right' ? '100%' : '0'});
        line-height: 1;
        display: flex;
        align-items: flex-end;
        padding: 0;
        margin: 0;
        margin-top: ${f.vOffset || 0}px;
        font-size: ${f.fontSize * width}px;
        color: ${f.color};
        text-align: ${f.align};
        font-family: ${f.fontFamily || 'sans-serif'};
        font-weight: ${f.fontWeight || 'normal'};
        white-space: nowrap;
        z-index: 10;
      }
    `).join('\n') : '';
    console.log('   - Fields with CSS:', fields?.length || 0);
    console.log('   ✅ CSS generated');

    // Step 8: Generate HTML for Fields
    console.log('\n📄 [Step 8/13] Generating HTML for fields...');
    const fieldsHtml = fields ? fields.map(f => {
      const value = participant[f.key] || f.label || '';
      return `<div id="field_${f.id}">${value}</div>`;
    }).join('\n') : '';
    console.log('   - Fields with HTML:', fields?.length || 0);
    console.log('   ✅ HTML fields generated');

    // Step 9: Generate Complete HTML
    console.log('\n🌍 [Step 9/13] Generating complete HTML document...');
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Montserrat:wght@400;700&display=swap');
          body, html { 
            margin: 0; 
            padding: 0; 
            width: ${width}px; 
            height: ${height}px; 
            overflow: hidden; 
          }
          .container {
            position: relative;
            width: ${width}px;
            height: ${height}px;
            background-image: url('${imageSrc}');
            background-size: contain;
            background-repeat: no-repeat;
          }
          ${fieldsCss}
        </style>
      </head>
      <body>
        <div class="container">${fieldsHtml}</div>
      </body>
      </html>
    `;
    const htmlLength = htmlContent.length;
    console.log('   - HTML length:', htmlLength, 'characters');
    console.log('   ✅ Complete HTML generated');

    // Step 10: Save Debug HTML
    console.log('\n💾 [Step 10/13] Saving debug HTML...');
    const debugHtmlPath = path.join(__dirname, `../debug_cert_${(participant?.name || 'test').replace(/[^a-zA-Z0-9]/g, '-')}.html`);
    fs.writeFileSync(debugHtmlPath, htmlContent);
    console.log('   ✅ Debug HTML saved to:', debugHtmlPath);

    // Step 11: Load HTML in Page
    console.log('\n🌐 [Step 11/13] Loading HTML content in page...');
    console.log('   - Setting content with waitUntil: networkidle0');
    console.log('   - Timeout: 60000ms (60 seconds)');

    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    console.log('   ✅ HTML content loaded successfully');

    // Step 12: Wait for Fonts
    console.log('\n🔤 [Step 12/13] Waiting for fonts to load...');
    await page.evaluateHandle('document.fonts.ready');
    console.log('   ✅ Fonts loaded');

    // Step 12.5: Set Viewport
    console.log('\n🖥️  [Step 12.5/13] Setting viewport...');
    await page.setViewport({ width, height });
    console.log('   ✅ Viewport set to', width, 'x', height);

    // Step 13: Generate PDF
    console.log('\n🎨 [Step 13/13] Generating PDF...');
    console.log('   - Output path:', outputPath);
    console.log('   - Format: Custom (', width, 'x', height, 'px)');
    console.log('   - Print Background: true');

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      console.log('   ⚠️  Output directory does not exist, creating...');
      fs.mkdirSync(outputDir, { recursive: true });
      console.log('   ✅ Directory created');
    }

    await page.pdf({
      path: outputPath,
      width: `${width}px`,
      height: `${height}px`,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    console.log('   ✅ PDF generated successfully');

    // Check file was created
    if (fs.existsSync(outputPath)) {
      const fileSize = fs.statSync(outputPath).size;
      console.log('   - File size:', fileSize, 'bytes');
    } else {
      console.warn('   ⚠️  WARNING: PDF file not found at expected path!');
    }

    // Log to debug file
    const logData = `
    Timestamp: ${new Date().toISOString()}
    Participant: ${JSON.stringify(participant)}
    Template Dimensions: ${width}x${height}px
    Fields: ${JSON.stringify(fields)}
    TemplatePath: ${templatePath}
    OutputPath: ${outputPath}
    Status: SUCCESS
    --------------------------------------------------
    `;
    fs.appendFileSync(path.join(__dirname, '../debug_log.txt'), logData);

    console.log('\n✅ ========== CERTIFICATE GENERATION COMPLETE ==========\n');
    return outputPath;

  } catch (error) {
    console.error('\n💥 ========== CERTIFICATE GENERATION FAILED ==========');
    console.error('❌ Error Type:', error.constructor.name);
    console.error('❌ Error Message:', error.message);
    console.error('❌ Stack Trace:');
    console.error(error.stack);

    const errorLog = `
    Timestamp: ${new Date().toISOString()}
    Participant: ${participant?.name || 'Unknown'}
    Template: ${templatePath}
    Error: ${error.message}
    Stack: ${error.stack}
    --------------------------------------------------
    `;
    fs.appendFileSync(path.join(__dirname, '../debug_log.txt'), errorLog);

    console.error('\n========== END ERROR REPORT ==========\n');
    throw error;
  } finally {
    // CRITICAL: Only close the page, NOT the browser instance
    if (page) {
      console.log('🔒 Closing page...');
      await page.close();
      console.log('   ✅ Page closed');
    }
  }
};

