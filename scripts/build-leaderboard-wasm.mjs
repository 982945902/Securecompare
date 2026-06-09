import { existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const crateDir = resolve(root, 'wasm/leaderboard-crypto');
const outDir = resolve(root, 'server/leaderboard/crypto-wasm');

if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}

const result = spawnSync(
  'rustup',
  [
    'run',
    'stable',
    'wasm-pack',
    'build',
    '.',
    '--profile',
    'wasm',
    '--target',
    'web',
    '--out-dir',
    '../../server/leaderboard/crypto-wasm',
  ],
  {
    cwd: crateDir,
    env: {
      ...process.env,
      PATH: `${process.env.HOME}/.cargo/bin:${process.env.PATH ?? ''}`,
    },
    stdio: 'inherit',
  },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const generatedGitignore = resolve(outDir, '.gitignore');
if (existsSync(generatedGitignore)) {
  rmSync(generatedGitignore);
}
