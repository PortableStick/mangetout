#!/usr/bin/env node
// Porte qualité déterministe. Appelée par guard-bash.mjs sur commit/merge,
// et lançable à la main : `node .claude/hooks/gate.mjs [--commit|--merge]`.
//   commit -> secret-scan + typecheck + lint
//   merge  -> + tests
// Lenient quand un workspace/outil n'existe pas encore (rien à vérifier = vert).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';

const ROOT = process.cwd();
const level = process.argv.includes('--merge') ? 'merge' : 'commit';
const failures = [];

function run(label, cmd, args, cwd) {
  const res = spawnSync(cmd, args, { cwd, encoding: 'utf8', shell: process.platform === 'win32' });
  if (res.status !== 0) {
    failures.push(`✗ ${label}\n${(res.stdout || '') + (res.stderr || '')}`.trim());
    return false;
  }
  return true;
}

// --- Secret scan (staged files) — filet de sécurité intégré (dépôt PUBLIC) ---
function secretScan() {
  const staged = spawnSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (staged.status !== 0) return; // pas de staging -> rien à scanner
  const files = staged.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
  const PATTERNS = [
    [/sk-or-v1-[A-Za-z0-9]{20,}/, 'clé OpenRouter'],
    [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'clé privée'],
    [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, 'JWT en dur'],
    [/(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"][A-Za-z0-9!@#$%^&*_\-]{16,}['"]/i, 'secret assigné en dur'],
    [/AKIA[0-9A-Z]{16}/, 'clé AWS'],
  ];
  // Autorise .env.example (placeholders vides)
  for (const f of files) {
    if (f.endsWith('.env.example') || f.includes('.claude/hooks/')) continue;
    const abs = join(ROOT, f);
    if (!existsSync(abs)) continue;
    let content;
    try {
      content = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    for (const [rx, kind] of PATTERNS) {
      const m = content.match(rx);
      if (m) {
        failures.push(`✗ secret-scan : ${kind} détecté dans ${f} ("${m[0].slice(0, 12)}…"). Retire-le.`);
      }
    }
  }
}

// --- Détection des workspaces (monorepo : app/, server/, + racine) ---
function workspaces() {
  const dirs = [];
  for (const d of ['', 'app', 'server']) {
    const pkg = join(ROOT, d, 'package.json');
    if (existsSync(pkg)) {
      try {
        dirs.push({ dir: join(ROOT, d), pkg: JSON.parse(readFileSync(pkg, 'utf8')) });
      } catch {
        /* ignore */
      }
    }
  }
  return dirs;
}

secretScan();

for (const { dir, pkg } of workspaces()) {
  const scripts = pkg.scripts || {};
  const hasNodeModules = existsSync(join(dir, 'node_modules'));
  if (!hasNodeModules) continue; // deps pas installées -> rien à vérifier ici
  const rel = dir === ROOT ? '.' : dir.replace(ROOT + sep, '');
  if (existsSync(join(dir, 'tsconfig.json'))) {
    run(`typecheck (${rel})`, 'npx', ['tsc', '--noEmit'], dir);
  }
  if (scripts.lint) {
    run(`lint (${rel})`, 'npm', ['run', 'lint', '--silent'], dir);
  }
  if (level === 'merge' && scripts.test) {
    run(`tests (${rel})`, 'npm', ['test', '--silent'], dir);
  }
}

if (failures.length) {
  console.error(failures.join('\n\n'));
  process.exit(1);
}
console.log(`[gate] OK (${level})`);
process.exit(0);
