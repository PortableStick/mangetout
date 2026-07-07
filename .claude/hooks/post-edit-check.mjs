#!/usr/bin/env node
// PostToolUse hook (Edit | Write | MultiEdit).
// Lint + typecheck léger sur le fichier touché. Informational : renvoie un
// feedback au modèle (exit 2) SEULEMENT si le fichier a des erreurs, sinon exit 0.
// Ne bloque jamais l'écriture (elle a déjà eu lieu) — c'est un signal, pas une porte.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

let payload = {};
try {
  payload = JSON.parse(readStdin() || '{}');
} catch {
  process.exit(0);
}

const file = payload?.tool_input?.file_path || payload?.tool_input?.path || '';
if (!/\.(ts|tsx|js|jsx|mjs)$/.test(file) || !existsSync(file)) process.exit(0);

// Trouve la racine du workspace contenant ce fichier (remonte jusqu'à package.json)
function findWorkspace(f) {
  let d = dirname(f);
  const root = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(d, 'package.json'))) return d;
    const parent = dirname(d);
    if (parent === d || d.length < root.length) break;
    d = parent;
  }
  return null;
}

const ws = findWorkspace(file);
if (!ws || !existsSync(join(ws, 'node_modules'))) process.exit(0);

const hasEslint =
  existsSync(join(ws, 'eslint.config.js')) ||
  existsSync(join(ws, 'eslint.config.mjs')) ||
  existsSync(join(ws, '.eslintrc.js')) ||
  existsSync(join(ws, '.eslintrc.json'));
if (!hasEslint) process.exit(0);

const rel = relative(ws, file);
const res = spawnSync('npx', ['eslint', '--format', 'compact', rel], {
  cwd: ws,
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

const out = (res.stdout || '') + (res.stderr || '');
if (res.status !== 0 && /error/i.test(out)) {
  console.error(`[post-edit] ESLint a relevé des erreurs dans ${rel} :\n${out}\nCorrige-les avant de continuer.`);
  process.exit(2);
}
process.exit(0);
