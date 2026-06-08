/* @ts-self-types="./mpz_wasm_bench.d.ts" */
import { startSpawnerWorker } from './snippets/web-spawn-05868593a72e2d44/js/spawn.no-bundler.js';


/**
 * Common benchmark result containing timing and work done.
 */
export class BenchResult {
    static __wrap(ptr) {
        const obj = Object.create(BenchResult.prototype);
        obj.__wbg_ptr = ptr;
        BenchResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BenchResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_benchresult_free(ptr, 0);
    }
    /**
     * @returns {bigint}
     */
    get and_gates() {
        const ret = wasm.__wbg_get_benchresult_and_gates(this.__wbg_ptr);
        return BigInt.asUintN(64, ret);
    }
    /**
     * @returns {number}
     */
    get elapsed_ms() {
        const ret = wasm.__wbg_get_benchresult_elapsed_ms(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {bigint} arg0
     */
    set and_gates(arg0) {
        wasm.__wbg_set_benchresult_and_gates(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set elapsed_ms(arg0) {
        wasm.__wbg_set_benchresult_elapsed_ms(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) BenchResult.prototype[Symbol.dispose] = BenchResult.prototype.free;

/**
 * Global spawner which spawns closures into web workers.
 */
export class Spawner {
    static __wrap(ptr) {
        const obj = Object.create(Spawner.prototype);
        obj.__wbg_ptr = ptr;
        SpawnerFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SpawnerFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_spawner_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    getUrl() {
        const ret = wasm.spawner_getUrl(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    intoRaw() {
        const ptr = this.__destroy_into_raw();
        const ret = wasm.spawner_intoRaw(ptr);
        return ret >>> 0;
    }
    /**
     * Runs the spawner.
     * @param {string} url
     * @returns {Promise<void>}
     */
    run(url) {
        const ptr0 = passStringToWasm0(url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.spawner_run(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
}
if (Symbol.dispose) Spawner.prototype[Symbol.dispose] = Spawner.prototype.free;

export class WorkerData {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WorkerDataFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_workerdata_free(ptr, 0);
    }
}
if (Symbol.dispose) WorkerData.prototype[Symbol.dispose] = WorkerData.prototype.free;

/**
 * @param {number} a
 * @param {number} b
 * @returns {Promise<number>}
 */
export function compare_u32_in_memory_wasm(a, b) {
    const ret = wasm.compare_u32_in_memory_wasm(a, b);
    return ret;
}

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
 * @param {number} n
 * @param {number} ot_count
 * @param {number} concurrency
 * @returns {Promise<BenchResult>}
 */
export function ferret_sender(n, ot_count, concurrency) {
    const ret = wasm.ferret_sender(n, ot_count, concurrency);
    return ret;
}

/**
 * Returns the number of AND gates in the AES-128 circuit.
 * @returns {number}
 */
export function garble_core_aes128_and_count() {
    const ret = wasm.garble_core_aes128_and_count();
    return ret >>> 0;
}

/**
 * Benchmark half-gates evaluation (iterator): evaluate AES circuit n times.
 * Uses single-gate iterator interface.
 * Returns elapsed time and AND gates processed.
 * @param {number} n
 * @returns {BenchResult}
 */
export function garble_core_half_gates_evaluate(n) {
    const ret = wasm.garble_core_half_gates_evaluate(n);
    return BenchResult.__wrap(ret);
}

/**
 * Benchmark half-gates evaluation (batched): evaluate AES circuit n times.
 * Uses batched gate interface for better throughput.
 * Returns elapsed time and AND gates processed.
 * @param {number} n
 * @returns {BenchResult}
 */
export function garble_core_half_gates_evaluate_batched(n) {
    const ret = wasm.garble_core_half_gates_evaluate_batched(n);
    return BenchResult.__wrap(ret);
}

/**
 * Benchmark parallel circuit evaluation using rayon.
 * Evaluates multiple AES circuits in parallel.
 * Setup (untimed): garble circuits.
 * Timed: only the parallel evaluation phase.
 *
 * Runs on a Web Worker because rayon's Atomics.wait is forbidden on main
 * thread.
 * @param {number} n
 * @param {number} concurrency
 * @returns {Promise<BenchResult>}
 */
export function garble_core_half_gates_evaluate_parallel(n, concurrency) {
    const ret = wasm.garble_core_half_gates_evaluate_parallel(n, concurrency);
    return ret;
}

/**
 * Benchmark half-gates garbling: garble AES circuit n times.
 * Returns a checksum to prevent optimization.
 * @param {number} n
 * @returns {number}
 */
export function garble_core_half_gates_garble(n) {
    const ret = wasm.garble_core_half_gates_garble(n);
    return ret >>> 0;
}

/**
 * Benchmark evaluator with message replay.
 *
 * # Arguments
 * * `n` - Number of benchmark iterations
 * * `batch_size` - Number of AND gates per iteration (circuit_count calculated
 *   from this)
 * * `concurrency` - Maximum parallelism level
 * @param {number} n
 * @param {number} batch_size
 * @param {number} concurrency
 * @returns {Promise<BenchResult>}
 */
export function garble_evaluator(n, batch_size, concurrency) {
    const ret = wasm.garble_evaluator(n, batch_size, concurrency);
    return ret;
}

/**
 * Benchmark garbler with message replay.
 *
 * # Arguments
 * * `n` - Number of benchmark iterations
 * * `batch_size` - Number of AND gates per iteration (circuit_count calculated
 *   from this)
 * * `concurrency` - Maximum parallelism level
 * @param {number} n
 * @param {number} batch_size
 * @param {number} concurrency
 * @returns {Promise<BenchResult>}
 */
export function garble_garbler(n, batch_size, concurrency) {
    const ret = wasm.garble_garbler(n, batch_size, concurrency);
    return ret;
}

/**
 * Initialize the web_spawn spawner and rayon thread pool for MT benchmarks.
 * Must be called before running any MT benchmarks.
 * @param {number} thread_count
 * @returns {Promise<void>}
 */
export function init_thread_pool(thread_count) {
    const ret = wasm.init_thread_pool(thread_count);
    return ret;
}

/**
 * Starts the thread spawner on a dedicated worker thread.
 * @returns {Promise<any>}
 */
export function startSpawner() {
    const ret = wasm.startSpawner();
    return ret;
}

/**
 * Test if MT context works at all - minimal ping-pong test.
 * @returns {Promise<number>}
 */
export function test_mt_context_only() {
    const ret = wasm.test_mt_context_only();
    return ret;
}

/**
 * @param {number} spawner
 * @returns {Spawner}
 */
export function web_spawn_recover_spawner(spawner) {
    const ret = wasm.web_spawn_recover_spawner(spawner);
    return Spawner.__wrap(ret);
}

/**
 * @param {number} worker
 */
export function web_spawn_start_worker(worker) {
    wasm.web_spawn_start_worker(worker);
}

/**
 * Benchmark ZK prover check phase with 200K gates.
 * @param {number} n
 * @param {number} concurrency
 * @returns {Promise<BenchResult>}
 */
export function zk_core_prover_check_200k(n, concurrency) {
    const ret = wasm.zk_core_prover_check_200k(n, concurrency);
    return ret;
}

/**
 * Benchmark ZK prover check phase with 400K gates.
 * @param {number} n
 * @param {number} concurrency
 * @returns {Promise<BenchResult>}
 */
export function zk_core_prover_check_400k(n, concurrency) {
    const ret = wasm.zk_core_prover_check_400k(n, concurrency);
    return ret;
}

/**
 * Benchmark ZK prover check phase with 600K gates.
 * @param {number} n
 * @param {number} concurrency
 * @returns {Promise<BenchResult>}
 */
export function zk_core_prover_check_600k(n, concurrency) {
    const ret = wasm.zk_core_prover_check_600k(n, concurrency);
    return ret;
}

/**
 * Benchmark ZK prover execution: prove circuit n times.
 * This measures only the prover's execute phase (generating adjustments).
 * Returns elapsed time and AND gates processed.
 * @param {number} n
 * @returns {BenchResult}
 */
export function zk_core_prover_execute(n) {
    const ret = wasm.zk_core_prover_execute(n);
    return BenchResult.__wrap(ret);
}

/**
 * Benchmark ZK verifier check phase with 200K gates.
 * @param {number} n
 * @param {number} concurrency
 * @returns {Promise<BenchResult>}
 */
export function zk_core_verifier_check_200k(n, concurrency) {
    const ret = wasm.zk_core_verifier_check_200k(n, concurrency);
    return ret;
}

/**
 * Benchmark ZK verifier check phase with 400K gates.
 * @param {number} n
 * @param {number} concurrency
 * @returns {Promise<BenchResult>}
 */
export function zk_core_verifier_check_400k(n, concurrency) {
    const ret = wasm.zk_core_verifier_check_400k(n, concurrency);
    return ret;
}

/**
 * Benchmark ZK verifier check phase with 600K gates.
 * @param {number} n
 * @param {number} concurrency
 * @returns {Promise<BenchResult>}
 */
export function zk_core_verifier_check_600k(n, concurrency) {
    const ret = wasm.zk_core_verifier_check_600k(n, concurrency);
    return ret;
}

/**
 * Benchmark ZK verifier execution: verify circuit n times.
 * This measures only the verifier's execute phase (consuming adjustments).
 * Returns elapsed time and AND gates processed.
 * @param {number} n
 * @returns {BenchResult}
 */
export function zk_core_verifier_execute(n) {
    const ret = wasm.zk_core_verifier_execute(n);
    return BenchResult.__wrap(ret);
}

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
 * @param {number} n
 * @param {number} gate_count
 * @param {number} concurrency
 * @returns {Promise<BenchResult>}
 */
export function zk_prover(n, gate_count, concurrency) {
    const ret = wasm.zk_prover(n, gate_count, concurrency);
    return ret;
}

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
 * @param {number} n
 * @param {number} gate_count
 * @param {number} concurrency
 * @returns {Promise<BenchResult>}
 */
export function zk_verifier(n, gate_count, concurrency) {
    const ret = wasm.zk_verifier(n, gate_count, concurrency);
    return ret;
}
function __wbg_get_imports(memory) {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_debug_string_0accd80f45e5faa2: function(arg0, arg1) {
            const ret = debugString(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_is_function_754e9f305ff6029e: function(arg0) {
            const ret = typeof(arg0) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_undefined_67b456be8673d3d7: function(arg0) {
            const ret = arg0 === undefined;
            return ret;
        },
        __wbg___wbindgen_memory_fbc4c3e30b409f08: function() {
            const ret = wasm.memory;
            return ret;
        },
        __wbg___wbindgen_module_5dcc25d553a4424f: function() {
            const ret = wasmModule;
            return ret;
        },
        __wbg___wbindgen_rethrow_c4d99b4b53265290: function(arg0) {
            throw arg0;
        },
        __wbg___wbindgen_throw_1506f2235d1bdba0: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg__wbg_cb_unref_61db23ac97f16c31: function(arg0) {
            arg0._wbg_cb_unref();
        },
        __wbg_async_ed0edf9269e8f04a: function(arg0) {
            const ret = arg0.async;
            return ret;
        },
        __wbg_benchresult_new: function(arg0) {
            const ret = BenchResult.__wrap(arg0);
            return ret;
        },
        __wbg_buffer_a1f116eb4fdb1531: function(arg0) {
            const ret = arg0.buffer;
            return ret;
        },
        __wbg_call_9c758de292015997: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.call(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_data_93740e25a9d5b212: function(arg0) {
            const ret = arg0.data;
            return ret;
        },
        __wbg_get_de6a0f7d4d18a304: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_has_73740b27f436fed3: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.has(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_instanceof_Window_e093be59ee9a8e14: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Window;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_log_cf2e968649f3384e: function(arg0) {
            console.log(arg0);
        },
        __wbg_new_b682b81e8eaaf027: function(arg0, arg1) {
            try {
                var state0 = {a: arg0, b: arg1};
                var cb0 = (arg0, arg1) => {
                    const a = state0.a;
                    state0.a = 0;
                    try {
                        return wasm_bindgen_1c5140d6f7180b21___convert__closures_____invoke___js_sys_6388a4ed3e1ff5f9___Function_fn_wasm_bindgen_1c5140d6f7180b21___JsValue_____wasm_bindgen_1c5140d6f7180b21___sys__Undefined___js_sys_6388a4ed3e1ff5f9___Function_fn_wasm_bindgen_1c5140d6f7180b21___JsValue_____wasm_bindgen_1c5140d6f7180b21___sys__Undefined_______true_(a, state0.b, arg0, arg1);
                    } finally {
                        state0.a = a;
                    }
                };
                const ret = new Promise(cb0);
                return ret;
            } finally {
                state0.a = 0;
            }
        },
        __wbg_new_ce1ab61c1c2b300d: function() {
            const ret = new Object();
            return ret;
        },
        __wbg_new_d90091b82fdf5b91: function() {
            const ret = new Array();
            return ret;
        },
        __wbg_new_dc32d91df76232c8: function(arg0) {
            const ret = new Int32Array(arg0);
            return ret;
        },
        __wbg_new_typed_bf31d18f92484486: function(arg0, arg1) {
            try {
                var state0 = {a: arg0, b: arg1};
                var cb0 = (arg0, arg1) => {
                    const a = state0.a;
                    state0.a = 0;
                    try {
                        return wasm_bindgen_1c5140d6f7180b21___convert__closures_____invoke___js_sys_6388a4ed3e1ff5f9___Function_fn_wasm_bindgen_1c5140d6f7180b21___JsValue_____wasm_bindgen_1c5140d6f7180b21___sys__Undefined___js_sys_6388a4ed3e1ff5f9___Function_fn_wasm_bindgen_1c5140d6f7180b21___JsValue_____wasm_bindgen_1c5140d6f7180b21___sys__Undefined_______true_(a, state0.b, arg0, arg1);
                    } finally {
                        state0.a = a;
                    }
                };
                const ret = new Promise(cb0);
                return ret;
            } finally {
                state0.a = 0;
            }
        },
        __wbg_new_with_options_5c98ca2e0eb88040: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = new Worker(getStringFromWasm0(arg0, arg1), arg2);
            return ret;
        }, arguments); },
        __wbg_new_worker_227309bcfae51cd3: function(arg0, arg1) {
            const ret = new Worker(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_now_f565250295e2d180: function(arg0) {
            const ret = arg0.now();
            return ret;
        },
        __wbg_of_5d9c1c77975668d1: function(arg0, arg1, arg2) {
            const ret = Array.of(arg0, arg1, arg2);
            return ret;
        },
        __wbg_performance_68499ca0718837f5: function(arg0) {
            const ret = arg0.performance;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_postMessage_c28ba544836193c8: function() { return handleError(function (arg0, arg1) {
            arg0.postMessage(arg1);
        }, arguments); },
        __wbg_postMessage_cf975f9c13498b76: function() { return handleError(function (arg0, arg1) {
            arg0.postMessage(arg1);
        }, arguments); },
        __wbg_push_a6822215aa43e71c: function(arg0, arg1) {
            const ret = arg0.push(arg1);
            return ret;
        },
        __wbg_queueMicrotask_35c611f4a14830b2: function(arg0) {
            queueMicrotask(arg0);
        },
        __wbg_queueMicrotask_404ed0a58e0b63cc: function(arg0) {
            const ret = arg0.queueMicrotask;
            return ret;
        },
        __wbg_resolve_25a7e548d5881dca: function(arg0) {
            const ret = Promise.resolve(arg0);
            return ret;
        },
        __wbg_setTimeout_b5f25e402b6e8ff9: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.setTimeout(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_set_6e30c9374c26414c: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = Reflect.set(arg0, arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_set_name_23589521cd44588f: function(arg0, arg1, arg2) {
            arg0.name = getStringFromWasm0(arg1, arg2);
        },
        __wbg_set_onmessage_ad00166b07fad0be: function(arg0, arg1) {
            arg0.onmessage = arg1;
        },
        __wbg_set_type_efd1d9519b590c34: function(arg0, arg1) {
            arg0.type = __wbindgen_enum_WorkerType[arg1];
        },
        __wbg_startSpawnerWorker_3486d6889bbe5c87: function(arg0, arg1, arg2) {
            const ret = startSpawnerWorker(arg0, arg1, Spawner.__wrap(arg2));
            return ret;
        },
        __wbg_static_accessor_GLOBAL_9d53f2689e622ca1: function() {
            const ret = typeof global === 'undefined' ? null : global;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_GLOBAL_THIS_a1a35cec07001a8a: function() {
            const ret = typeof globalThis === 'undefined' ? null : globalThis;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_SELF_4c59f6c7ea29a144: function() {
            const ret = typeof self === 'undefined' ? null : self;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_URL_98f524d1aa8a70dd: function() {
            const ret = import.meta.url;
            return ret;
        },
        __wbg_static_accessor_WINDOW_e70ae9f2eb052253: function() {
            const ret = typeof window === 'undefined' ? null : window;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_then_18f476d590e58992: function(arg0, arg1, arg2) {
            const ret = arg0.then(arg1, arg2);
            return ret;
        },
        __wbg_then_47213a40b6aeb86c: function(arg0, arg1) {
            const ret = arg0.then(arg1);
            return ret;
        },
        __wbg_then_ac7b025999b52837: function(arg0, arg1) {
            const ret = arg0.then(arg1);
            return ret;
        },
        __wbg_value_2b11d753e2be3e57: function(arg0) {
            const ret = arg0.value;
            return ret;
        },
        __wbg_waitAsync_bfb213899274180a: function(arg0, arg1, arg2) {
            const ret = Atomics.waitAsync(arg0, arg1 >>> 0, arg2);
            return ret;
        },
        __wbg_waitAsync_fbc667ccb52b6fbf: function() {
            const ret = Atomics.waitAsync;
            return ret;
        },
        __wbindgen_cast_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 500, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm_bindgen_1c5140d6f7180b21___convert__closures_____invoke___wasm_bindgen_1c5140d6f7180b21___JsValue______true_);
            return ret;
        },
        __wbindgen_cast_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 732, ret: Result(Unit), inner_ret: Some(Result(Unit)) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm_bindgen_1c5140d6f7180b21___convert__closures_____invoke___wasm_bindgen_1c5140d6f7180b21___JsValue__core_fb3f680599ce85f8___result__Result_____wasm_bindgen_1c5140d6f7180b21___JsError___true_);
            return ret;
        },
        __wbindgen_cast_0000000000000003: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 734, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm_bindgen_1c5140d6f7180b21___convert__closures_____invoke___js_sys_6388a4ed3e1ff5f9___futures__task__wait_async_polyfill__MessageEvent______true_);
            return ret;
        },
        __wbindgen_cast_0000000000000004: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_cast_0000000000000005: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
        __wbindgen_link_e2b5a1199ad11c6b: function(arg0) {
            const val = `onmessage = function (ev) {
                let [ia, index, value] = ev.data;
                ia = new Int32Array(ia.buffer);
                let result = Atomics.wait(ia, index, value);
                postMessage(result);
            };
            `;
            const ret = typeof URL.createObjectURL === 'undefined' ? "data:application/javascript," + encodeURIComponent(val) : URL.createObjectURL(new Blob([val], { type: "text/javascript" }));
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        memory: memory || new WebAssembly.Memory({initial:34,maximum:65536,shared:true}),
    };
    return {
        __proto__: null,
        "./mpz_wasm_bench_bg.js": import0,
    };
}

function wasm_bindgen_1c5140d6f7180b21___convert__closures_____invoke___wasm_bindgen_1c5140d6f7180b21___JsValue______true_(arg0, arg1, arg2) {
    wasm.wasm_bindgen_1c5140d6f7180b21___convert__closures_____invoke___wasm_bindgen_1c5140d6f7180b21___JsValue______true_(arg0, arg1, arg2);
}

function wasm_bindgen_1c5140d6f7180b21___convert__closures_____invoke___js_sys_6388a4ed3e1ff5f9___futures__task__wait_async_polyfill__MessageEvent______true_(arg0, arg1, arg2) {
    wasm.wasm_bindgen_1c5140d6f7180b21___convert__closures_____invoke___js_sys_6388a4ed3e1ff5f9___futures__task__wait_async_polyfill__MessageEvent______true_(arg0, arg1, arg2);
}

function wasm_bindgen_1c5140d6f7180b21___convert__closures_____invoke___wasm_bindgen_1c5140d6f7180b21___JsValue__core_fb3f680599ce85f8___result__Result_____wasm_bindgen_1c5140d6f7180b21___JsError___true_(arg0, arg1, arg2) {
    const ret = wasm.wasm_bindgen_1c5140d6f7180b21___convert__closures_____invoke___wasm_bindgen_1c5140d6f7180b21___JsValue__core_fb3f680599ce85f8___result__Result_____wasm_bindgen_1c5140d6f7180b21___JsError___true_(arg0, arg1, arg2);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

function wasm_bindgen_1c5140d6f7180b21___convert__closures_____invoke___js_sys_6388a4ed3e1ff5f9___Function_fn_wasm_bindgen_1c5140d6f7180b21___JsValue_____wasm_bindgen_1c5140d6f7180b21___sys__Undefined___js_sys_6388a4ed3e1ff5f9___Function_fn_wasm_bindgen_1c5140d6f7180b21___JsValue_____wasm_bindgen_1c5140d6f7180b21___sys__Undefined_______true_(arg0, arg1, arg2, arg3) {
    wasm.wasm_bindgen_1c5140d6f7180b21___convert__closures_____invoke___js_sys_6388a4ed3e1ff5f9___Function_fn_wasm_bindgen_1c5140d6f7180b21___JsValue_____wasm_bindgen_1c5140d6f7180b21___sys__Undefined___js_sys_6388a4ed3e1ff5f9___Function_fn_wasm_bindgen_1c5140d6f7180b21___JsValue_____wasm_bindgen_1c5140d6f7180b21___sys__Undefined_______true_(arg0, arg1, arg2, arg3);
}


const __wbindgen_enum_WorkerType = ["classic", "module"];
const BenchResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_benchresult_free(ptr, 1));
const SpawnerFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_spawner_free(ptr, 1));
const WorkerDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_workerdata_free(ptr, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => wasm.__wbindgen_destroy_closure(state.a, state.b));

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer !== wasm.memory.buffer) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.buffer !== wasm.memory.buffer) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function makeMutClosure(arg0, arg1, f) {
    const state = { a: arg0, b: arg1, cnt: 1 };
    const real = (...args) => {

        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            state.a = a;
            real._wbg_cb_unref();
        }
    };
    real._wbg_cb_unref = () => {
        if (--state.cnt === 0) {
            wasm.__wbindgen_destroy_closure(state.a, state.b);
            state.a = 0;
            CLOSURE_DTORS.unregister(state);
        }
    };
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : undefined);
if (cachedTextDecoder) cachedTextDecoder.decode();

const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().slice(ptr, ptr + len));
}

const cachedTextEncoder = (typeof TextEncoder !== 'undefined' ? new TextEncoder() : undefined);

if (cachedTextEncoder) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module, thread_stack_size) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    if (typeof thread_stack_size !== 'undefined' && (typeof thread_stack_size !== 'number' || thread_stack_size === 0 || thread_stack_size % 65536 !== 0)) {
        throw new Error('invalid stack size');
    }

    wasm.__wbindgen_start(thread_stack_size);
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module, memory) {
    if (wasm !== undefined) return wasm;

    let thread_stack_size
    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module, memory, thread_stack_size} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports(memory);
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module, thread_stack_size);
}

async function __wbg_init(module_or_path, memory) {
    if (wasm !== undefined) return wasm;

    let thread_stack_size
    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path, memory, thread_stack_size} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('mpz_wasm_bench_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports(memory);

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module, thread_stack_size);
}

export { initSync, __wbg_init as default };
