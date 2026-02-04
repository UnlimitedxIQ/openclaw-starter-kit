'use strict';

const fs = require('fs/promises');
const path = require('path');

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJson(filePath, defaultValue = null) {
  try {
    const txt = await fs.readFile(filePath, 'utf8');
    return JSON.parse(txt);
  } catch (err) {
    if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) return defaultValue;
    throw err;
  }
}

async function writeJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  await ensureDir(dir);

  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  const txt = JSON.stringify(data, null, 2) + '\n';
  await fs.writeFile(tmp, txt, 'utf8');
  await fs.rename(tmp, filePath);
}

async function appendText(filePath, text) {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  await fs.appendFile(filePath, text, 'utf8');
}

async function readTextTail(filePath, maxChars = 4000) {
  try {
    const txt = await fs.readFile(filePath, 'utf8');
    if (txt.length <= maxChars) return txt;
    return txt.slice(txt.length - maxChars);
  } catch (err) {
    if (err && err.code === 'ENOENT') return '';
    throw err;
  }
}

module.exports = {
  fileExists,
  ensureDir,
  readJson,
  writeJsonAtomic,
  appendText,
  readTextTail,
};
