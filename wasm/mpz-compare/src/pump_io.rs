use std::{
    collections::VecDeque,
    io,
    pin::Pin,
    sync::{Arc, Mutex},
    task::{Context, Poll, Waker},
};

use futures::{AsyncRead, AsyncWrite};

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[derive(Clone, Default)]
pub struct PumpIo {
    state: Arc<Mutex<PumpIoState>>,
}

#[derive(Default)]
struct PumpIoState {
    inbound: VecDeque<u8>,
    outbound: VecDeque<u8>,
    read_waker: Option<Waker>,
    remote_closed: bool,
}

impl PumpIo {
    pub fn push_inbound(&self, bytes: &[u8]) {
        let mut state = self.state.lock().expect("pump io mutex poisoned");
        state.inbound.extend(bytes);
        if let Some(waker) = state.read_waker.take() {
            waker.wake();
        }
    }

    pub fn take_outbound(&self) -> Vec<u8> {
        let mut state = self.state.lock().expect("pump io mutex poisoned");
        state.outbound.drain(..).collect()
    }

    pub fn close_remote(&self) {
        let mut state = self.state.lock().expect("pump io mutex poisoned");
        state.remote_closed = true;
        if let Some(waker) = state.read_waker.take() {
            waker.wake();
        }
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub struct WasmPumpIo {
    io: PumpIo,
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
impl WasmPumpIo {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            io: PumpIo::default(),
        }
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
}

impl AsyncRead for PumpIo {
    fn poll_read(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &mut [u8],
    ) -> Poll<io::Result<usize>> {
        let mut state = self.state.lock().expect("pump io mutex poisoned");

        if state.inbound.is_empty() {
            if state.remote_closed {
                return Poll::Ready(Ok(0));
            }
            state.read_waker = Some(cx.waker().clone());
            return Poll::Pending;
        }

        let len = buf.len().min(state.inbound.len());
        for slot in &mut buf[..len] {
            *slot = state
                .inbound
                .pop_front()
                .expect("checked inbound length before read");
        }

        Poll::Ready(Ok(len))
    }
}

impl AsyncWrite for PumpIo {
    fn poll_write(
        self: Pin<&mut Self>,
        _cx: &mut Context<'_>,
        buf: &[u8],
    ) -> Poll<io::Result<usize>> {
        let mut state = self.state.lock().expect("pump io mutex poisoned");
        state.outbound.extend(buf);
        Poll::Ready(Ok(buf.len()))
    }

    fn poll_flush(self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<io::Result<()>> {
        Poll::Ready(Ok(()))
    }

    fn poll_close(self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<io::Result<()>> {
        Poll::Ready(Ok(()))
    }
}

#[cfg(test)]
mod tests {
    use futures::io::{AsyncReadExt, AsyncWriteExt};
    use mpz_common::Context as MpzContext;
    use serio::{SinkExt, stream::IoStreamExt};

    use super::*;

    #[test]
    fn writes_are_exposed_as_outbound_bytes() {
        let io = PumpIo::default();
        let mut writer = io.clone();

        pollster::block_on(writer.write_all(&[1, 2, 3])).unwrap();

        assert_eq!(io.take_outbound(), vec![1, 2, 3]);
        assert!(io.take_outbound().is_empty());
    }

    #[test]
    fn pushed_inbound_bytes_can_be_read() {
        let io = PumpIo::default();
        let mut reader = io.clone();

        io.push_inbound(&[4, 5, 6]);

        let mut buf = [0u8; 3];
        pollster::block_on(reader.read_exact(&mut buf)).unwrap();

        assert_eq!(buf, [4, 5, 6]);
    }

    #[test]
    fn works_as_mpz_single_threaded_context_transport() {
        let io_a = PumpIo::default();
        let io_b = PumpIo::default();
        let mut ctx_a = MpzContext::new_single_threaded(io_a.clone());
        let mut ctx_b = MpzContext::new_single_threaded(io_b.clone());

        pollster::block_on(ctx_a.io_mut().send(42u32)).unwrap();
        io_b.push_inbound(&io_a.take_outbound());

        let received: u32 = pollster::block_on(ctx_b.io_mut().expect_next()).unwrap();
        assert_eq!(received, 42);
    }

    #[test]
    fn close_remote_allows_pending_reads_to_finish_with_eof() {
        let io = PumpIo::default();
        let mut reader = io.clone();

        io.close_remote();

        let mut buf = [0u8; 1];
        let read = pollster::block_on(reader.read(&mut buf)).unwrap();
        assert_eq!(read, 0);
    }
}
