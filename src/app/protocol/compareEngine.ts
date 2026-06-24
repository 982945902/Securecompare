import { comparePrivateValues, type CompareEngineInfo, type CompareOutcome } from './compareSession';
import type { ByteTransport } from './webrtcTransport';

export type CompareEngineRunInput = {
  myValue: number;
  role: 'challenger' | 'accepter';
  transport: ByteTransport;
};

export type CompareProtocolEngine = {
  info: CompareEngineInfo;
  run(input: CompareEngineRunInput): Promise<CompareOutcome>;
};

type PlaintextPrototypeMessage = {
  engine: 'plaintext-prototype-v1';
  type: 'input';
  value: number;
};

export const plaintextPrototypeEngine: CompareProtocolEngine = {
  info: {
    id: 'plaintext-prototype-v1',
    label: '明文原型通道',
    mpcReady: false,
    peerInputTransport: 'plaintext-datachannel',
    notice:
      '当前原型会直接交换比较输入，仅用于开发验证；真正双端 MPC 引擎接入前，不应视为生产级隐私比较。',
  },
  run: async ({ myValue, transport }) => {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const message: PlaintextPrototypeMessage = {
      engine: 'plaintext-prototype-v1',
      type: 'input',
      value: myValue,
    };
    transport.send(encoder.encode(JSON.stringify(message)));

    while (true) {
      const bytes = await transport.receive();
      const peerMessage = JSON.parse(decoder.decode(bytes)) as Partial<PlaintextPrototypeMessage>;
      if (
        peerMessage.engine !== 'plaintext-prototype-v1' ||
        peerMessage.type !== 'input' ||
        typeof peerMessage.value !== 'number'
      ) {
        continue;
      }

      return comparePrivateValues({ mine: myValue, peer: peerMessage.value });
    }
  },
};
