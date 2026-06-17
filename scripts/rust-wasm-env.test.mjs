import { describe, expect, it } from 'vitest';

import { ensureRustWasmToolchain, rustToolchainEnv } from './rust-wasm-env.mjs';

describe('rust wasm build environment', () => {
  it('installs the nightly pieces required for build-std wasm builds', () => {
    const calls = [];
    ensureRustWasmToolchain({
      toolchain: 'nightly',
      needsRustSrc: true,
      run: (command, args) => {
        calls.push([command, args]);
        return { status: 0 };
      },
    });

    expect(calls).toEqual([
      ['rustup', ['toolchain', 'install', 'nightly', '--profile', 'minimal']],
      ['rustup', ['target', 'add', 'wasm32-unknown-unknown', '--toolchain', 'nightly']],
      ['rustup', ['component', 'add', 'rust-src', '--toolchain', 'nightly']],
    ]);
  });

  it('pins cargo to the selected toolchain while preserving npm binaries on PATH', () => {
    const env = rustToolchainEnv(
      { HOME: '/vercel/home', PATH: '/repo/node_modules/.bin:/usr/local/bin:/usr/bin' },
      'nightly',
    );

    expect(env.RUSTUP_TOOLCHAIN).toBe('nightly');
    expect(env.PATH).toBe('/repo/node_modules/.bin:/vercel/home/.cargo/bin:/usr/local/bin:/usr/bin');
  });
});
