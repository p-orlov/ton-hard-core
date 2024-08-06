import { Builder, Address, SendMode, Cell, toNano } from '@ton/core';
import { sign } from '@ton/crypto';

export const DEFAULT_SUBWALLET_ID = 698983191;

export const ValidUntil = {
  now: () => Math.floor(Date.now() / 1000),
  seconds: (ttl: number) => ValidUntil.now() + ttl,
  default: () => ValidUntil.seconds(1000)
};

const curry = <T extends unknown[], U extends unknown[], R>(
  f: (...args: [...T, ...U]) => R,
  ...a: T
) => {
  return (...b: U) => f(...a, ...b);
};

export const queryId = (value?: number) => (builder: Builder) =>
  builder.storeUint(value || 0, 64);

export const seqno = (value?: number) => (builder: Builder) =>
  builder.storeUint(value || 0, 32);

export const subWallet = (value?: number) => (builder: Builder) =>
  builder.storeUint(value || DEFAULT_SUBWALLET_ID, 32);

export const address = (value: Address) => (builder: Builder) =>
  builder.storeAddress(value);

export const validUntil = (value?: number) => (builder: Builder) =>
  builder.storeUint(value || ValidUntil.default(), 32);

export const setV4R2 = () => (builder: Builder) => builder.storeUint(0, 8);

export const sendMode =
  (...modes: SendMode[]) =>
  (builder: Builder) =>
    builder.storeUint(
      modes.reduce((acc, mode) => acc + mode, 0),
      32
    );

export const ref = (value: Cell) => (builder: Builder) =>
  builder.storeRef(value);

export const maybe =
  <T extends unknown>(fn: (arg: T) => (b: Builder) => Builder, value: T) =>
  (builder: Builder) => {
    if (value) {
      builder.storeBit(1);
      return fn(value)(builder);
    }
    return builder.storeBit(0);
  };

export const internalMessageCode = () => (builder: Builder) =>
  builder.storeUint(0, 1);

export const ihr = (enabled: boolean) => (builder: Builder) =>
  builder.storeBit(!enabled);

export const bounce = (enabled: boolean) => (builder: Builder) =>
  builder.storeBit(enabled);

export const bounced = (isBounced: boolean) => (builder: Builder) =>
  builder.storeBit(isBounced);

export const addrNone = () => (builder: Builder) => builder.storeUint(0, 2);

export const coins = (value: number | string | bigint) => (builder: Builder) =>
  builder.storeCoins(toNano(value));

export const nanoCoins = (value: number | bigint) => (builder: Builder) =>
  builder.storeCoins(value);

export const extraCurrency = () => (builder: Builder) => builder.storeBit(0); // todo

export const ihrFee = (value?: number | string | bigint) => coins(value || 0);
export const forwardingFee = (value?: number | string | bigint) =>
  coins(value || 0);

export const createdAt = (value: number) => (builder: Builder) =>
  builder.storeUint(value, 32);

export const createdLt = (value: number) => (builder: Builder) =>
  builder.storeUint(value, 64);

export const isInitMessage = (isInit: boolean) => (builder: Builder) =>
  builder.storeBit(isInit);

export const operationCode = (value: number | bigint) => (builder: Builder) =>
  builder.storeUint(value, 32);

export const comment = (value: string) => (builder: Builder) => {
  builder.storeUint(0, 32);
  builder.storeStringTail(value);
  return builder;
};

export const buffer = (value: Buffer) => (builder: Builder) =>
  builder.storeBuffer(value);

export const append = (value: Cell) => (builder: Builder) =>
  builder.storeBuilder(value.asBuilder());

export const signed =
  (cellToSign: Cell, privateKey: Buffer) => (builder: Builder) => {
    const signature = sign(cellToSign.hash(), privateKey);

    builder.storeBuffer(signature);
    builder.storeBuilder(cellToSign.asBuilder());

    return builder;
  };

export const externalMessageCode = () => (builder: Builder) =>
  builder.storeUint(2, 2);

type Buildable = (builder: Builder) => Builder;

export const cell = (...args: Buildable[]) => {
  const builder = new Builder();

  for (const fn of args) {
    fn(builder);
  }

  return builder.endCell();
};
