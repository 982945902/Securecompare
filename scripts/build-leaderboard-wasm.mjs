import { existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { DEFAULT_RUST_TOOLCHAIN, ensureRustWasmToolchain, rustToolchainEnv } from './rust-wasm-env.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const crateDir = resolve(root, 'wasm/leaderboard-crypto');
const toolchain = DEFAULT_RUST_TOOLCHAIN;
const outDirs = [
  resolve(root, 'server/leaderboard/crypto-wasm'),
  resolve(root, 'src/app/protocol/leaderboard-wasm'),
];

ensureRustWasmToolchain({ toolchain });

for (const outDir of outDirs) {
  buildLeaderboardWasm(outDir);
}

function buildLeaderboardWasm(outDir) {
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }

  const result = spawnSync(
    'wasm-pack',
    [
      'build',
      '.',
      '--profile',
      'wasm',
      '--target',
      'web',
      '--out-dir',
      outDir,
    ],
    {
      cwd: crateDir,
      env: rustToolchainEnv(process.env, toolchain),
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
}
