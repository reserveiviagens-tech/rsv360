#!/usr/bin/env node
/**
 * Reproduz o job Security Scan / NPM Audit (root + backend + site-publico).
 * Equivalente ao workflow .github/workflows/security-scan.yml (steps NPM Audit).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gateScript = path.join(repoRoot, '.github', 'scripts', 'audit-gate.py');
const allowlist = path.join(repoRoot, '.github', 'audit-allowlist.json');

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function runGate(label, cwd, extraArgs = []) {
  const tmp = path.join(os.tmpdir(), `rsv360-audit-${label}-${Date.now()}.json`);
  const audit = spawnSync('npm', ['audit', '--omit=dev', '--json', ...extraArgs], {
    cwd,
    encoding: 'utf8',
    shell: true,
    maxBuffer: 64 * 1024 * 1024,
  });

  const raw = (audit.stdout || '').trim();
  if (!raw) {
    fail(`npm audit (${label}) não devolveu JSON`);
  }
  fs.writeFileSync(tmp, raw, 'utf8');

  const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
  const gate = spawnSync(pyCmd, [gateScript, tmp, allowlist], { encoding: 'utf8' });
  try {
    fs.unlinkSync(tmp);
  } catch {
    /* ignore */
  }

  process.stdout.write(gate.stdout || '');
  if (gate.stderr) process.stderr.write(gate.stderr);
  if (gate.status !== 0) {
    fail(`audit-gate falhou (${label})`);
  }
  console.log(`\n✅ NPM Audit gate OK — ${label}\n`);
}

console.log('NPM Audit gate (local repro CI)\n');
runGate('root', repoRoot);
runGate('backend', path.join(repoRoot, 'backend'));
runGate('site-publico', repoRoot, ['--workspace=apps/site-publico']);
console.log('✅ Todos os gates passaram (critical/high fixos ou allowlisted).');