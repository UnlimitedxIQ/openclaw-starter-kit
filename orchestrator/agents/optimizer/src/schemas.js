import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readJson(relPath) {
  const p = path.join(__dirname, relPath);
  const txt = fs.readFileSync(p, 'utf8');
  return JSON.parse(txt);
}

export const SCHEMAS = {
  input: readJson(path.join('..', 'schema', 'input.schema.json')),
  output: readJson(path.join('..', 'schema', 'output.schema.json'))
};
