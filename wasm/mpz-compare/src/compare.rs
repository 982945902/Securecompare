use std::sync::Arc;

#[cfg(target_arch = "wasm32")]
use std::{cell::RefCell, rc::Rc};

use mpz_circuits::{Circuit, CircuitBuilder, Feed, Node};
use mpz_common::{Context, context::test_st_context};
use mpz_garble::protocol::semihonest::{Evaluator, Garbler};
use mpz_memory_core::{
    MemoryExt, ViewExt,
    binary::{U8, U32},
    correlated::Delta,
};
use mpz_ot::ideal::cot::ideal_cot;
use mpz_vm_core::{Call, prelude::*};
use rand::{SeedableRng, rngs::StdRng};

use crate::pump_io::PumpIo;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen_futures::spawn_local;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CompareResult {
    Less,
    Equal,
    Greater,
}

impl CompareResult {
    #[cfg(target_arch = "wasm32")]
    pub fn as_i32(self) -> i32 {
        match self {
            Self::Less => -1,
            Self::Equal => 0,
            Self::Greater => 1,
        }
    }
}

pub fn compare_u32_circuit() -> Arc<Circuit> {
    let mut builder = CircuitBuilder::new();
    let a: [_; 32] = std::array::from_fn(|_| builder.add_input());
    let b: [_; 32] = std::array::from_fn(|_| builder.add_input());

    let mut lt = builder.get_const_zero();
    let mut eq = builder.get_const_one();

    for idx in (0..32).rev() {
        let not_a = builder.add_inv_gate(a[idx]);
        let a_lt_b = builder.add_and_gate(not_a, b[idx]);
        let prefix_lt = builder.add_and_gate(eq, a_lt_b);
        lt = add_or(&mut builder, lt, prefix_lt);

        let diff = builder.add_xor_gate(a[idx], b[idx]);
        let same = builder.add_inv_gate(diff);
        eq = builder.add_and_gate(eq, same);
    }

    builder.add_output(lt);
    builder.add_output(eq);
    for _ in 2..8 {
        let zero = builder.add_xor_gate(lt, lt);
        builder.add_output(zero);
    }

    Arc::new(builder.build().unwrap())
}

fn add_or(builder: &mut CircuitBuilder, a: Node<Feed>, b: Node<Feed>) -> Node<Feed> {
    let xor = builder.add_xor_gate(a, b);
    let and = builder.add_and_gate(a, b);
    builder.add_xor_gate(xor, and)
}

pub async fn compare_u32_in_memory(a: u32, b: u32) -> Result<CompareResult, String> {
    let circuit = compare_u32_circuit();
    let mut rng = StdRng::seed_from_u64(0);
    let delta = Delta::random(&mut rng);
    let (cot_send, cot_recv) = ideal_cot(delta.into_inner());
    let (mut ctx_gb, mut ctx_ev) = test_st_context(1024 * 1024);

    let mut gb = Garbler::new(cot_send, [0u8; 16], delta);
    let mut ev = Evaluator::new(cot_recv);
    let circuit_gb = circuit.clone();
    let circuit_ev = circuit;

    let (gb_out, ev_out) = futures::join!(
        async {
            let alice: U32 = gb.alloc().map_err(|e| e.to_string())?;
            let bob: U32 = gb.alloc().map_err(|e| e.to_string())?;

            gb.mark_private(alice).map_err(|e| e.to_string())?;
            gb.mark_blind(bob).map_err(|e| e.to_string())?;

            let out: U8 = gb
                .call(
                    Call::builder(circuit_gb)
                        .arg(alice)
                        .arg(bob)
                        .build()
                        .map_err(|e| e.to_string())?,
                )
                .map_err(|e| e.to_string())?;
            let mut decoded = gb.decode(out).map_err(|e| e.to_string())?;

            gb.assign(alice, a).map_err(|e| e.to_string())?;
            gb.commit(alice).map_err(|e| e.to_string())?;
            gb.commit(bob).map_err(|e| e.to_string())?;

            gb.execute_all(&mut ctx_gb)
                .await
                .map_err(|e| e.to_string())?;
            decoded
                .try_recv()
                .map_err(|e| e.to_string())?
                .ok_or_else(|| "garbler output was not ready".to_string())
        },
        async {
            let alice: U32 = ev.alloc().map_err(|e| e.to_string())?;
            let bob: U32 = ev.alloc().map_err(|e| e.to_string())?;

            ev.mark_blind(alice).map_err(|e| e.to_string())?;
            ev.mark_private(bob).map_err(|e| e.to_string())?;

            let out: U8 = ev
                .call(
                    Call::builder(circuit_ev)
                        .arg(alice)
                        .arg(bob)
                        .build()
                        .map_err(|e| e.to_string())?,
                )
                .map_err(|e| e.to_string())?;
            let mut decoded = ev.decode(out).map_err(|e| e.to_string())?;

            ev.assign(bob, b).map_err(|e| e.to_string())?;
            ev.commit(alice).map_err(|e| e.to_string())?;
            ev.commit(bob).map_err(|e| e.to_string())?;

            ev.execute_all(&mut ctx_ev)
                .await
                .map_err(|e| e.to_string())?;
            decoded
                .try_recv()
                .map_err(|e| e.to_string())?
                .ok_or_else(|| "evaluator output was not ready".to_string())
        }
    );

    let gb_out = gb_out?;
    let ev_out = ev_out?;
    if gb_out != ev_out {
        return Err(format!(
            "garbler and evaluator decoded different outputs: {gb_out:#04x} vs {ev_out:#04x}"
        ));
    }

    decode_compare_byte(gb_out)
}

pub async fn compare_u32_garbler_with_pump_io(
    a: u32,
    io: PumpIo,
) -> Result<CompareResult, String> {
    let circuit = compare_u32_circuit();
    let mut rng = StdRng::seed_from_u64(0);
    let delta = Delta::random(&mut rng);
    let (cot_send, _) = ideal_cot(delta.into_inner());
    let mut ctx = Context::new_single_threaded(io);
    let mut gb = Garbler::new(cot_send, [0u8; 16], delta);

    let alice: U32 = gb.alloc().map_err(|e| e.to_string())?;
    let bob: U32 = gb.alloc().map_err(|e| e.to_string())?;

    gb.mark_private(alice).map_err(|e| e.to_string())?;
    gb.mark_blind(bob).map_err(|e| e.to_string())?;

    let out: U8 = gb
        .call(
            Call::builder(circuit)
                .arg(alice)
                .arg(bob)
                .build()
                .map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;
    let mut decoded = gb.decode(out).map_err(|e| e.to_string())?;

    gb.assign(alice, a).map_err(|e| e.to_string())?;
    gb.commit(alice).map_err(|e| e.to_string())?;
    gb.commit(bob).map_err(|e| e.to_string())?;

    gb.execute_all(&mut ctx).await.map_err(|e| e.to_string())?;
    let out = decoded
        .try_recv()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "garbler output was not ready".to_string())?;

    decode_compare_byte(out)
}

pub async fn compare_u32_evaluator_with_pump_io(
    b: u32,
    io: PumpIo,
) -> Result<CompareResult, String> {
    let circuit = compare_u32_circuit();
    let (_, cot_recv) = ideal_cot([0u8; 16].into());
    let mut ctx = Context::new_single_threaded(io);
    let mut ev = Evaluator::new(cot_recv);

    let alice: U32 = ev.alloc().map_err(|e| e.to_string())?;
    let bob: U32 = ev.alloc().map_err(|e| e.to_string())?;

    ev.mark_blind(alice).map_err(|e| e.to_string())?;
    ev.mark_private(bob).map_err(|e| e.to_string())?;

    let out: U8 = ev
        .call(
            Call::builder(circuit)
                .arg(alice)
                .arg(bob)
                .build()
                .map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;
    let mut decoded = ev.decode(out).map_err(|e| e.to_string())?;

    ev.assign(bob, b).map_err(|e| e.to_string())?;
    ev.commit(alice).map_err(|e| e.to_string())?;
    ev.commit(bob).map_err(|e| e.to_string())?;

    ev.execute_all(&mut ctx).await.map_err(|e| e.to_string())?;
    let out = decoded
        .try_recv()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "evaluator output was not ready".to_string())?;

    decode_compare_byte(out)
}

fn decode_compare_byte(value: u8) -> Result<CompareResult, String> {
    let lt = value & 0b0000_0001 != 0;
    let eq = value & 0b0000_0010 != 0;

    match (lt, eq) {
        (true, false) => Ok(CompareResult::Less),
        (false, true) => Ok(CompareResult::Equal),
        (false, false) => Ok(CompareResult::Greater),
        (true, true) => Err(format!("invalid compare encoding: {value:#04x}")),
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub async fn compare_u32_in_memory_wasm(a: u32, b: u32) -> Result<i32, JsValue> {
    compare_u32_in_memory(a, b)
        .await
        .map(CompareResult::as_i32)
        .map_err(|e| JsValue::from_str(&e))
}

#[cfg(target_arch = "wasm32")]
#[derive(Default)]
struct WasmComparePumpState {
    result_code: Option<i32>,
    error: Option<String>,
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub struct WasmComparePumpSession {
    io: PumpIo,
    state: Rc<RefCell<WasmComparePumpState>>,
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
impl WasmComparePumpSession {
    #[wasm_bindgen(constructor)]
    pub fn new(role: &str, value: u32) -> Result<Self, JsValue> {
        let io = PumpIo::default();
        let state = Rc::new(RefCell::new(WasmComparePumpState::default()));

        let future_io = io.clone();
        let future_state = state.clone();
        match role {
            "garbler" => spawn_local(async move {
                store_wasm_compare_result(
                    future_state,
                    compare_u32_garbler_with_pump_io(value, future_io).await,
                );
            }),
            "evaluator" => spawn_local(async move {
                store_wasm_compare_result(
                    future_state,
                    compare_u32_evaluator_with_pump_io(value, future_io).await,
                );
            }),
            other => {
                return Err(JsValue::from_str(&format!(
                    "unsupported compare role: {other}"
                )));
            }
        }

        Ok(Self { io, state })
    }

    #[wasm_bindgen(js_name = pushInbound)]
    pub fn push_inbound(&self, bytes: &[u8]) {
        self.io.push_inbound(bytes);
    }

    #[wasm_bindgen(js_name = takeOutbound)]
    pub fn take_outbound(&self) -> Vec<u8> {
        self.io.take_outbound()
    }

    #[wasm_bindgen(js_name = closeRemote)]
    pub fn close_remote(&self) {
        self.io.close_remote();
    }

    #[wasm_bindgen(js_name = isDone)]
    pub fn is_done(&self) -> bool {
        let state = self.state.borrow();
        state.result_code.is_some() || state.error.is_some()
    }

    #[wasm_bindgen(js_name = resultCode)]
    pub fn result_code(&self) -> i32 {
        self.state.borrow().result_code.unwrap_or(2)
    }

    pub fn error(&self) -> Option<String> {
        self.state.borrow().error.clone()
    }
}

#[cfg(target_arch = "wasm32")]
fn store_wasm_compare_result(
    state: Rc<RefCell<WasmComparePumpState>>,
    result: Result<CompareResult, String>,
) {
    let mut state = state.borrow_mut();
    match result {
        Ok(result) => state.result_code = Some(result.as_i32()),
        Err(error) => state.error = Some(error),
    }
}

#[cfg(test)]
mod tests {
    use std::{
        cell::RefCell,
        rc::Rc,
        task::{Context as TaskContext, Poll},
    };

    use futures::{FutureExt, future::LocalBoxFuture, task::noop_waker};
    use mpz_circuits::evaluate;

    use super::*;

    #[test]
    fn compare_circuit_matches_plain_u32_ordering() {
        for (a, b, expected) in [
            (0, 0, CompareResult::Equal),
            (0, 1, CompareResult::Less),
            (1, 0, CompareResult::Greater),
            (42, 69, CompareResult::Less),
            (69, 42, CompareResult::Greater),
            (u32::MAX, u32::MAX, CompareResult::Equal),
            (u32::MAX - 1, u32::MAX, CompareResult::Less),
            (u32::MAX, u32::MAX - 1, CompareResult::Greater),
            (1 << 31, (1 << 31) - 1, CompareResult::Greater),
        ] {
            let encoded: u8 = evaluate!(compare_u32_circuit(), a, b).unwrap();
            assert_eq!(decode_compare_byte(encoded).unwrap(), expected);
        }
    }

    #[test]
    fn compare_protocol_runs_two_party_in_memory() {
        for (a, b, expected) in [
            (7, 9, CompareResult::Less),
            (9, 7, CompareResult::Greater),
            (9, 9, CompareResult::Equal),
        ] {
            let actual = pollster::block_on(compare_u32_in_memory(a, b)).unwrap();
            assert_eq!(actual, expected);
        }
    }

    #[test]
    fn compare_protocol_runs_split_roles_over_pump_io() {
        for (a, b, expected) in [
            (7, 9, CompareResult::Less),
            (9, 7, CompareResult::Greater),
            (9, 9, CompareResult::Equal),
        ] {
            let (actual_garbler, actual_evaluator) = run_split_compare(a, b);
            assert_eq!(actual_garbler, expected);
            assert_eq!(actual_evaluator, expected);
        }
    }

    fn run_split_compare(a: u32, b: u32) -> (CompareResult, CompareResult) {
        let io_garbler = PumpIo::default();
        let io_evaluator = PumpIo::default();
        let garbler_result = Rc::new(RefCell::new(None));
        let evaluator_result = Rc::new(RefCell::new(None));

        let garbler_result_ref = garbler_result.clone();
        let evaluator_result_ref = evaluator_result.clone();
        let garbler_io_for_future = io_garbler.clone();
        let evaluator_io_for_future = io_evaluator.clone();
        let mut garbler_future: LocalBoxFuture<'static, ()> = async move {
            *garbler_result_ref.borrow_mut() =
                Some(compare_u32_garbler_with_pump_io(a, garbler_io_for_future).await);
        }
        .boxed_local();
        let mut evaluator_future: LocalBoxFuture<'static, ()> = async move {
            *evaluator_result_ref.borrow_mut() =
                Some(compare_u32_evaluator_with_pump_io(b, evaluator_io_for_future).await);
        }
        .boxed_local();

        let waker = noop_waker();
        let mut cx = TaskContext::from_waker(&waker);
        let mut garbler_done = false;
        let mut evaluator_done = false;

        for _ in 0..10_000 {
            if !garbler_done {
                garbler_done = matches!(garbler_future.as_mut().poll(&mut cx), Poll::Ready(()));
            }
            if !evaluator_done {
                evaluator_done = matches!(evaluator_future.as_mut().poll(&mut cx), Poll::Ready(()));
            }

            let garbler_to_evaluator = io_garbler.take_outbound();
            if !garbler_to_evaluator.is_empty() {
                io_evaluator.push_inbound(&garbler_to_evaluator);
            }

            let evaluator_to_garbler = io_evaluator.take_outbound();
            if !evaluator_to_garbler.is_empty() {
                io_garbler.push_inbound(&evaluator_to_garbler);
            }

            if garbler_done && evaluator_done {
                let garbler = garbler_result
                    .borrow_mut()
                    .take()
                    .expect("garbler result set")
                    .unwrap();
                let evaluator = evaluator_result
                    .borrow_mut()
                    .take()
                    .expect("evaluator result set")
                    .unwrap();
                return (garbler, evaluator);
            }
        }

        panic!("split compare did not finish");
    }
}
