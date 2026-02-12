// backend/utils/env.js
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// RESOLVES TO BACKEND ROOT (one level up from this utils directory)
// Used to locate backend assets like uploads, without reliance on local paths.
const ROOT_DIR = path.resolve(__dirname, '..');

const DEFAULT_ORGANIZATION_NAME = 'Yukti Yantra';

export { __dirname, __filename, require, ROOT_DIR, DEFAULT_ORGANIZATION_NAME };
