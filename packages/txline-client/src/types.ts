export type TxlineNetwork = "mainnet" | "devnet";

export type TxlineCredentials = {
  readonly jwt: string;
  readonly apiToken: string;
};

export type TxlineClientConfig = {
  readonly baseUrl?: string;
  readonly credentials?: TxlineCredentials;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
};

export type GuestSession = {
  readonly token: string;
};

export type ActivateTokenInput = {
  readonly jwt: string;
  readonly txSig: string;
  readonly walletSignature: string;
  readonly leagues: readonly number[];
};

export type PurchaseQuoteInput = {
  readonly jwt: string;
  readonly buyerPubkey: string;
  readonly txlineAmount: number;
};

export type FixtureSnapshotParams = {
  readonly competitionId?: number;
  readonly startEpochDay?: number;
};

export type TimestampedSnapshotParams = {
  readonly asOf?: number;
};

export type IntervalUpdateParams = {
  readonly epochDay: number;
  readonly hourOfDay: number;
  readonly interval: number;
  readonly fixtureId?: number;
};

export type StreamParams = {
  readonly fixtureId?: number;
  readonly lastEventId?: string;
};

export type ScoreStatValidationParams = {
  readonly fixtureId: number;
  readonly seq: number;
  readonly statKey: number;
  readonly statKey2?: number;
};
