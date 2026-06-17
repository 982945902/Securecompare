import { existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { DEFAULT_RUST_TOOLCHAIN, ensureRustWasmToolchain, rustToolchainEnv } from './rust-wasm-env.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const crateDir = resolve(root, 'wasm/mpz-compare');
const outDir = resolve(root, 'src/app/protocol/mpz-wasm');
const toolchain = DEFAULT_RUST_TOOLCHAIN;

if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}

ensureRustWasmToolchain({ toolchain, needsRustSrc: true });

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
    '../../src/app/protocol/mpz-wasm',
    '--',
    '-Zbuild-std=panic_abort,std',
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
