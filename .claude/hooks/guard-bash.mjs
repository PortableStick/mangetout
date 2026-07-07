#!/usr/bin/env node
// PreToolUse hook (Bash | PowerShell).
// 1) Bloque les commandes destructrices (exit 2 = bloquant, stderr renvoyé au modèle).
// 2) Sur `git commit` / `git merge`, lance la porte qualité (gate.mjs) et bloque si rouge.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  process.exit(0); // pas de payload exploitable -> ne pas bloquer
}

const cmd = String(payload?.tool_input?.command ?? '');
if (!cmd.trim()) process.exit(0);

// --- 1. Commandes destructrices ---
const DESTRUCTIVE = [
  /\brm\s+-[a-z]*r[a-z]*f|\brm\s+-[a-z]*f[a-z]*r\b/i, // rm -rf / -fr
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+clean\s+-[a-z]*f/i,
  /\bgit\s+checkout\s+--\s+\./i,
  /\bgit\s+push\s+.*--force(?!-with-lease)/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /:\s*>\s*\/(dev|etc|usr|bin)/i,
  /\bshutdown\b|\breboot\b/i,
];
for (const rx of DESTRUCTIVE) {
  if (rx.test(cmd)) {
    console.error(
      `[guard-bash] Commande potentiellement destructrice bloquée : "${cmd}".\n` +
        `Si c'est intentionnel, demande à l'humain de la lancer manuellement.`
    );
    process.exit(2);
  }
}

// --- 2. Porte qualité sur commit / merge ---
const isCommit = /\bgit\s+commit\b/i.test(cmd);
const isMerge = /\bgit\s+merge\b/i.test(cmd);
if (isCommit || isMerge) {
  const level = isMerge ? '--merge' : '--commit';
  const res = spawnSync(process.execPath, [join(__dirname, 'gate.mjs'), level], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    cwd: process.cwd(),
  });
  const out = (res.stdout || '') + (res.stderr || '');
  if (res.status !== 0) {
    console.error(
      `[guard-bash] Porte qualité ROUGE — ${isMerge ? 'merge' : 'commit'} bloqué.\n${out}`
    );
    process.exit(2);
  }
}

process.exit(0);
