/* tslint:disable */
/* eslint-disable */

export class WasmComparePumpSession {
    free(): void;
    [Symbol.dispose](): void;
    closeRemote(): void;
    error(): string | undefined;
    isDone(): boolean;
    constructor(role: string, value: number);
    pushInbound(bytes: Uint8Array): void;
    resultCode(): number;
    takeOutbound(): Uint8Array;
}

export class WasmPumpIo {
    free(): void;
    [Symbol.dispose](): void;
    closeRemote(): void;
    constructor();
    pushInbound(bytes: Uint8Array): void;
    takeOutbound(): Uint8Array;
}

export function compare_u32_in_memory_wasm(a: number, b: number): Promise<number>;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_wasmcomparepumpsession_free: (a: number, b: number) => void;
    readonly __wbg_wasmpumpio_free: (a: number, b: number) => void;
    readonly compare_u32_in_memory_wasm: (a: number, b: number) => any;
    readonly wasmcomparepumpsession_closeRemote: (a: number) => void;
    readonly wasmcomparepumpsession_error: (a: number) => [number, number];
    readonly wasmcomparepumpsession_isDone: (a: number) => number;
    readonly wasmcomparepumpsession_new: (a: number, b: number, c: number) => [number, number, number];
    readonly wasmcomparepumpsession_pushInbound: (a: number, b: number, c: number) => void;
    readonly wasmcomparepumpsession_resultCode: (a: number) => number;
    readonly wasmcomparepumpsession_takeOutbound: (a: number) => [number, number];
    readonly wasmpumpio_closeRemote: (a: number) => void;
    readonly wasmpumpio_new: () => number;
    readonly wasmpumpio_pushInbound: (a: number, b: number, c: number) => void;
    readonly wasmpumpio_takeOutbound: (a: number) => [number, number];
    readonly wasm_bindgen_a5457f9c9f2efa46___convert__closures_____invoke___wasm_bindgen_a5457f9c9f2efa46___JsValue__core_374fcb84e2c5b563___result__Result_____wasm_bindgen_a5457f9c9f2efa46___JsError___true_: (a: number, b: number, c: any) => [number, number];
    readonly wasm_bindgen_a5457f9c9f2efa46___convert__closures_____invoke___js_sys_615d5fb1f4423c6d___Function_fn_wasm_bindgen_a5457f9c9f2efa46___JsValue_____wasm_bindgen_a5457f9c9f2efa46___sys__Undefined___js_sys_615d5fb1f4423c6d___Function_fn_wasm_bindgen_a5457f9c9f2efa46___JsValue_____wasm_bindgen_a5457f9c9f2efa46___sys__Undefined_______true_: (a: number, b: number, c: any, d: any) => void;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_destroy_closure: (a: number, b: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
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
