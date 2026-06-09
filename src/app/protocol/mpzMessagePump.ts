import type { WasmPumpIo } from './mpz-wasm/securecompare_mpz_wasm';

export type WasmPumpIoTransport = Pick<WasmPumpIo, 'pushInbound' | 'takeOutbound' | 'closeRemote'>;

export type OutboundSender = (bytes: Uint8Array) => void;

export function drainOutbound(io: Pick<WasmPumpIoTransport, 'takeOutbound'>): Uint8Array | null {
  const outbound = io.takeOutbound();
  return outbound.byteLength > 0 ? outbound : null;
}

export function forwardOutbound(
  io: Pick<WasmPumpIoTransport, 'takeOutbound'>,
  send: OutboundSender,
): boolean {
  const outbound = drainOutbound(io);
  if (!outbound) {
    return false;
  }
  send(outbound);
  return true;
}
