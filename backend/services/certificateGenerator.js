import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
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
  if (!browserInstance) {
    console.log('[Puppeteer] Launching new browser instance...');
    browserInstance = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    // Handle browser disconnect gracefully
    browserInstance.on('disconnected', () => {
      console.log('[Puppeteer] Browser disconnected, clearing instance');
      browserInstance = null;
    });
  }
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
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {

    // Detect mime type
    const ext = path.extname(templatePath).toLowerCase();
    let mimeType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';

    const imageBitmap = fs.readFileSync(templatePath);
    const imageBase64 = Buffer.from(imageBitmap).toString('base64');
    const imageSrc = `data:${mimeType};base64,${imageBase64}`;

    // Generate CSS for fields
    const fieldsCss = fields ? fields.map(f => `
      #field_${f.id} {
        position: absolute;
        left: ${f.x * 100}%;
        top: ${f.y * 100}%;
        transform: translate(-${f.align === 'center' ? '50%' : f.align === 'right' ? '100%' : '0'}, -50%);
        font-size: ${f.fontSize * 100}vw; /* Scale relative to viewport width */
        color: ${f.color};
        text-align: ${f.align};
        font-family: ${f.fontFamily || 'sans-serif'};
        font-weight: ${f.fontWeight || 'normal'};
        white-space: nowrap;
        z-index: 10; /* Ensure text is above background */
      }
    `).join('\n') : '';

    // Generate HTML for fields
    const fieldsHtml = fields ? fields.map(f => {
      const value = participant[f.key] || f.label || '';
      return `<div id="field_${f.id}">${value}</div>`;
    }).join('\n') : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Roboto:wght@400;700&display=swap');
          
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; }
          .container {
            position: relative;
            width: 100%;
            height: 100vh;
            background-image: url('${imageSrc}');
            background-size: 100% 100%;
            background-repeat: no-repeat;
            background-position: center;
            font-family: 'Roboto', sans-serif;
            z-index: 1;
          }
          ${fieldsCss}
        </style>
      </head>
      <body>
        <div class="container">
          ${fieldsHtml}
        </div>
      </body>
      </html>
    `;

    // DEBUG: Save HTML to file to inspect
    const debugHtmlPath = outputPath.replace('.pdf', '.html');
    fs.writeFileSync(debugHtmlPath, htmlContent);

    const logData = `
    Timestamp: ${new Date().toISOString()}
    Participant: ${JSON.stringify(participant)}
    Fields: ${JSON.stringify(fields)}
    TemplatePath: ${templatePath}
    OutputPath: ${outputPath}
    --------------------------------------------------
    `;
    fs.appendFileSync(path.join(__dirname, '../debug_log.txt'), logData);

    await page.setContent(htmlContent);
    await page.evaluateHandle('document.fonts.ready');

    // Set viewport to A4 landscape dimensions (approx)
    await page.setViewport({ width: 1123, height: 794 });

    await page.pdf({
      path: outputPath,
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    return outputPath;
  } catch (error) {
    const errorLog = `
    Timestamp: ${new Date().toISOString()}
    Participant: ${participant.name || 'Unknown'}
    Template: ${templatePath}
    Error: ${error.message}
    Stack: ${error.stack}
    --------------------------------------------------
    `;
    fs.appendFileSync(path.join(__dirname, '../debug_log.txt'), errorLog);
    console.error('[Certificate Generation Error]', error);
    throw error;
  } finally {
    // CRITICAL: Only close the page, NOT the browser instance
    // The browser instance is reused across all certificates
    if (page) {
      await page.close();
    }
  }
};
