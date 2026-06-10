/* tslint:disable */
/* eslint-disable */

export class DemoLeaderboardAuthority {
    free(): void;
    [Symbol.dispose](): void;
    encryptCiphertext(value: number, seed: number): Uint8Array;
    makeToken(value: number, seed: number): Uint8Array;
    constructor(value_bits: number, max_clients: number, seed: number);
}

export function compareMhOre(ciphertext: Uint8Array, token: Uint8Array): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_demoleaderboardauthority_free: (a: number, b: number) => void;
    readonly compareMhOre: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly demoleaderboardauthority_encryptCiphertext: (a: number, b: number, c: number) => [number, number, number, number];
    readonly demoleaderboardauthority_makeToken: (a: number, b: number, c: number) => [number, number, number, number];
    readonly demoleaderboardauthority_new: (a: number, b: number, c: number) => [number, number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
