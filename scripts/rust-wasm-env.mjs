import { spawnSync } from 'node:child_process';

export const DEFAULT_RUST_TOOLCHAIN = process.env.RUST_TOOLCHAIN ?? 'nightly';

export function ensureRustWasmToolchain({
  toolchain = DEFAULT_RUST_TOOLCHAIN,
  needsRustSrc = false,
  run = spawnSync,
} = {}) {
  runChecked(run, 'rustup', ['toolchain', 'install', toolchain, '--profile', 'minimal']);
  runChecked(run, 'rustup', [
    'target',
    'add',
    'wasm32-unknown-unknown',
    '--toolchain',
    toolchain,
  ]);

  if (needsRustSrc) {
    runChecked(run, 'rustup', ['component', 'add', 'rust-src', '--toolchain', toolchain]);
  }
}

export function rustToolchainEnv(env = process.env, toolchain = DEFAULT_RUST_TOOLCHAIN) {
  const cargoBin = `${env.HOME}/.cargo/bin`;
  const pathParts = (env.PATH ?? '').split(':').filter(Boolean);
  const npmBinParts = pathParts.filter((part) => part.endsWith('/node_modules/.bin'));
  const otherParts = pathParts.filter((part) => !part.endsWith('/node_modules/.bin') && part !== cargoBin);

  return {
    ...env,
    RUSTUP_TOOLCHAIN: toolchain,
    PATH: [...npmBinParts, cargoBin, ...otherParts].join(':'),
  };
}

function runChecked(run, command, args) {
  const result = run(command, args, { stdio: 'inherit' });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with status ${result.status ?? 'unknown'}`);
  }
}
