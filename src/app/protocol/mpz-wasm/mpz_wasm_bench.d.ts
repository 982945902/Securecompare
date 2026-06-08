/* tslint:disable */
/* eslint-disable */

/**
 * Common benchmark result containing timing and work done.
 */
export class BenchResult {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    and_gates: bigint;
    elapsed_ms: number;
}

/**
 * Global spawner which spawns closures into web workers.
 */
export class Spawner {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    getUrl(): string;
    intoRaw(): number;
    /**
     * Runs the spawner.
     */
    run(url: string): Promise<void>;
}

export class WorkerData {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
}

export function compare_u32_in_memory_wasm(a: number, b: number): Promise<number>;

/**
 * Benchmark isolated Ferret sender with MT context and message replay.
 *
 * Records receiver->sender messages once during setup using MT contexts,
 * then benchmarks sender execution in isolation using MT replay.
 *
 * # Arguments
 * * `n` - Number of iterations
 * * `ot_count` - Number of OTs to generate (e.g., 100000, 1000000, 10000000)
 * * `concurrency` - Maximum parallelism level (max children per parent thread)
 */
export function ferret_sender(n: number, ot_count: number, concurrency: number): Promise<BenchResult>;

/**
 * Returns the number of AND gates in the AES-128 circuit.
 */
export function garble_core_aes128_and_count(): number;

/**
 * Benchmark half-gates evaluation (iterator): evaluate AES circuit n times.
 * Uses single-gate iterator interface.
 * Returns elapsed time and AND gates processed.
 */
export function garble_core_half_gates_evaluate(n: number): BenchResult;

/**
 * Benchmark half-gates evaluation (batched): evaluate AES circuit n times.
 * Uses batched gate interface for better throughput.
 * Returns elapsed time and AND gates processed.
 */
export function garble_core_half_gates_evaluate_batched(n: number): BenchResult;

/**
 * Benchmark parallel circuit evaluation using rayon.
 * Evaluates multiple AES circuits in parallel.
 * Setup (untimed): garble circuits.
 * Timed: only the parallel evaluation phase.
 *
 * Runs on a Web Worker because rayon's Atomics.wait is forbidden on main
 * thread.
 */
export function garble_core_half_gates_evaluate_parallel(n: number, concurrency: number): Promise<BenchResult>;

/**
 * Benchmark half-gates garbling: garble AES circuit n times.
 * Returns a checksum to prevent optimization.
 */
export function garble_core_half_gates_garble(n: number): number;

/**
 * Benchmark evaluator with message replay.
 *
 * # Arguments
 * * `n` - Number of benchmark iterations
 * * `batch_size` - Number of AND gates per iteration (circuit_count calculated
 *   from this)
 * * `concurrency` - Maximum parallelism level
 */
export function garble_evaluator(n: number, batch_size: number, concurrency: number): Promise<BenchResult>;

/**
 * Benchmark garbler with message replay.
 *
 * # Arguments
 * * `n` - Number of benchmark iterations
 * * `batch_size` - Number of AND gates per iteration (circuit_count calculated
 *   from this)
 * * `concurrency` - Maximum parallelism level
 */
export function garble_garbler(n: number, batch_size: number, concurrency: number): Promise<BenchResult>;

/**
 * Initialize the web_spawn spawner and rayon thread pool for MT benchmarks.
 * Must be called before running any MT benchmarks.
 */
export function init_thread_pool(thread_count: number): Promise<void>;

/**
 * Starts the thread spawner on a dedicated worker thread.
 */
export function startSpawner(): Promise<any>;

/**
 * Test if MT context works at all - minimal ping-pong test.
 */
export function test_mt_context_only(): Promise<number>;

export function web_spawn_recover_spawner(spawner: number): Spawner;

export function web_spawn_start_worker(worker: number): void;

/**
 * Benchmark ZK prover check phase with 200K gates.
 */
export function zk_core_prover_check_200k(n: number, concurrency: number): Promise<BenchResult>;

/**
 * Benchmark ZK prover check phase with 400K gates.
 */
export function zk_core_prover_check_400k(n: number, concurrency: number): Promise<BenchResult>;

/**
 * Benchmark ZK prover check phase with 600K gates.
 */
export function zk_core_prover_check_600k(n: number, concurrency: number): Promise<BenchResult>;

/**
 * Benchmark ZK prover execution: prove circuit n times.
 * This measures only the prover's execute phase (generating adjustments).
 * Returns elapsed time and AND gates processed.
 */
export function zk_core_prover_execute(n: number): BenchResult;

/**
 * Benchmark ZK verifier check phase with 200K gates.
 */
export function zk_core_verifier_check_200k(n: number, concurrency: number): Promise<BenchResult>;

/**
 * Benchmark ZK verifier check phase with 400K gates.
 */
export function zk_core_verifier_check_400k(n: number, concurrency: number): Promise<BenchResult>;

/**
 * Benchmark ZK verifier check phase with 600K gates.
 */
export function zk_core_verifier_check_600k(n: number, concurrency: number): Promise<BenchResult>;

/**
 * Benchmark ZK verifier execution: verify circuit n times.
 * This measures only the verifier's execute phase (consuming adjustments).
 * Returns elapsed time and AND gates processed.
 */
export function zk_core_verifier_execute(n: number): BenchResult;

/**
 * Benchmark isolated prover with message replay.
 *
 * Records verifier->prover messages once during setup,
 * then benchmarks prover execution in isolation using replay.
 *
 * # Arguments
 * * `n` - Number of iterations
 * * `gate_count` - Target number of AND gates (e.g., 100000, 1000000,
 *   10000000)
 * * `concurrency` - Number of worker threads for parallel execution
 */
export function zk_prover(n: number, gate_count: number, concurrency: number): Promise<BenchResult>;

/**
 * Benchmark isolated verifier with message replay.
 *
 * Records prover->verifier messages once during setup,
 * then benchmarks verifier execution in isolation using replay.
 *
 * # Arguments
 * * `n` - Number of iterations
 * * `gate_count` - Target number of AND gates (e.g., 100000, 1000000,
 *   10000000)
 * * `concurrency` - Number of worker threads for parallel execution
 */
export function zk_verifier(n: number, gate_count: number, concurrency: number): Promise<BenchResult>;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly __wbg_benchresult_free: (a: number, b: number) => void;
    readonly __wbg_get_benchresult_and_gates: (a: number) => bigint;
    readonly __wbg_get_benchresult_elapsed_ms: (a: number) => number;
    readonly __wbg_set_benchresult_and_gates: (a: number, b: bigint) => void;
    readonly __wbg_set_benchresult_elapsed_ms: (a: number, b: number) => void;
    readonly compare_u32_in_memory_wasm: (a: number, b: number) => any;
    readonly ferret_sender: (a: number, b: number, c: number) => any;
    readonly garble_core_half_gates_evaluate: (a: number) => number;
    readonly garble_core_half_gates_evaluate_batched: (a: number) => number;
    readonly garble_core_half_gates_evaluate_parallel: (a: number, b: number) => any;
    readonly garble_core_half_gates_garble: (a: number) => number;
    readonly garble_evaluator: (a: number, b: number, c: number) => any;
    readonly garble_garbler: (a: number, b: number, c: number) => any;
    readonly init_thread_pool: (a: number) => any;
    readonly test_mt_context_only: () => any;
    readonly zk_core_prover_check_200k: (a: number, b: number) => any;
    readonly zk_core_prover_check_400k: (a: number, b: number) => any;
    readonly zk_core_prover_check_600k: (a: number, b: number) => any;
    readonly zk_core_prover_execute: (a: number) => number;
    readonly zk_core_verifier_check_200k: (a: number, b: number) => any;
    readonly zk_core_verifier_check_400k: (a: number, b: number) => any;
    readonly zk_core_verifier_check_600k: (a: number, b: number) => any;
    readonly zk_core_verifier_execute: (a: number) => number;
    readonly zk_prover: (a: number, b: number, c: number) => any;
    readonly zk_verifier: (a: number, b: number, c: number) => any;
    readonly garble_core_aes128_and_count: () => number;
    readonly __wbg_spawner_free: (a: number, b: number) => void;
    readonly __wbg_workerdata_free: (a: number, b: number) => void;
    readonly spawner_getUrl: (a: number) => any;
    readonly spawner_intoRaw: (a: number) => number;
    readonly spawner_run: (a: number, b: number, c: number) => any;
    readonly startSpawner: () => any;
    readonly web_spawn_recover_spawner: (a: number) => number;
    readonly web_spawn_start_worker: (a: number) => void;
    readonly wasm_bindgen_1c5140d6f7180b21___convert__closures_____invoke___wasm_bindgen_1c5140d6f7180b21___JsValue__core_fb3f680599ce85f8___result__Result_____wasm_bindgen_1c5140d6f7180b21___JsError___true_: (a: number, b: number, c: any) => [number, number];
    readonly wasm_bindgen_1c5140d6f7180b21___convert__closures_____invoke___js_sys_6388a4ed3e1ff5f9___Function_fn_wasm_bindgen_1c5140d6f7180b21___JsValue_____wasm_bindgen_1c5140d6f7180b21___sys__Undefined___js_sys_6388a4ed3e1ff5f9___Function_fn_wasm_bindgen_1c5140d6f7180b21___JsValue_____wasm_bindgen_1c5140d6f7180b21___sys__Undefined_______true_: (a: number, b: number, c: any, d: any) => void;
    readonly wasm_bindgen_1c5140d6f7180b21___convert__closures_____invoke___wasm_bindgen_1c5140d6f7180b21___JsValue______true_: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_1c5140d6f7180b21___convert__closures_____invoke___js_sys_6388a4ed3e1ff5f9___futures__task__wait_async_polyfill__MessageEvent______true_: (a: number, b: number, c: any) => void;
    readonly memory: WebAssembly.Memory;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_destroy_closure: (a: number, b: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_thread_destroy: (a?: number, b?: number, c?: number) => void;
    readonly __wbindgen_start: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput, memory?: WebAssembly.Memory, thread_stack_size?: number }} module - Passing `SyncInitInput` directly is deprecated.
 * @param {WebAssembly.Memory} memory - Deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput, memory?: WebAssembly.Memory, thread_stack_size?: number } | SyncInitInput, memory?: WebAssembly.Memory): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput>, memory?: WebAssembly.Memory, thread_stack_size?: number }} module_or_path - Passing `InitInput` directly is deprecated.
 * @param {WebAssembly.Memory} memory - Deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput>, memory?: WebAssembly.Memory, thread_stack_size?: number } | InitInput | Promise<InitInput>, memory?: WebAssembly.Memory): Promise<InitOutput>;
