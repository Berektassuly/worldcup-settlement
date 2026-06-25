import {
  TXLINE_BASE_URLS,
  fixtureArraySchema,
  oddsArraySchema,
  oddsSchema,
  scoreArraySchema,
  scoreSchema,
  scoresStatValidationSchema,
  type Fixture,
  type Odds,
  type Score,
  type ScoresStatValidation
} from "@worldcup-settlement/shared";
import { readSseMessages, parseSseJson } from "./sse";
import type {
  ActivateTokenInput,
  FixtureSnapshotParams,
  GuestSession,
  IntervalUpdateParams,
  PurchaseQuoteInput,
  ScoreStatValidationParams,
  StreamParams,
  TimestampedSnapshotParams,
  TxlineClientConfig,
  TxlineCredentials
} from "./types";

type RequestOptions = {
  readonly method?: "GET" | "POST";
  readonly body?: unknown;
  readonly credentials?: Partial<TxlineCredentials>;
  readonly query?: Record<string, number | string | undefined>;
  readonly accept?: string;
  readonly timeoutMs?: number;
};

export class TxlineClient {
  private readonly baseUrl: string;
  private readonly credentials?: TxlineCredentials;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(config: TxlineClientConfig = {}) {
    this.baseUrl = normalizeBaseUrl(config.baseUrl ?? TXLINE_BASE_URLS.mainnet);
    this.credentials = config.credentials;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.timeoutMs = config.timeoutMs ?? 30_000;
  }

  async startGuestSession(): Promise<GuestSession> {
    const response = await this.requestJson<unknown>("/auth/guest/start", {
      method: "POST",
      credentials: {}
    });

    if (typeof response === "object" && response !== null && "token" in response) {
      return { token: String(response.token) };
    }

    throw new Error("TxLINE guest session response did not include a token");
  }

  async activateToken(input: ActivateTokenInput): Promise<string> {
    const response = await this.requestJson<unknown>("/api/token/activate", {
      method: "POST",
      credentials: { jwt: input.jwt },
      body: {
        txSig: input.txSig,
        walletSignature: input.walletSignature,
        leagues: input.leagues
      }
    });

    if (typeof response === "string") {
      return response;
    }

    if (typeof response === "object" && response !== null && "token" in response) {
      return String(response.token);
    }

    throw new Error("TxLINE token activation response did not include an API token");
  }

  async requestPurchaseQuote(input: PurchaseQuoteInput): Promise<unknown> {
    return this.requestJson<unknown>("/api/guest/purchase/quote", {
      method: "POST",
      credentials: { jwt: input.jwt },
      body: {
        buyerPubkey: input.buyerPubkey,
        txlineAmount: input.txlineAmount
      }
    });
  }

  async getFixturesSnapshot(params: FixtureSnapshotParams = {}): Promise<Fixture[]> {
    const json = await this.requestJson<unknown>("/api/fixtures/snapshot", {
      query: {
        competitionId: params.competitionId,
        startEpochDay: params.startEpochDay
      }
    });

    return fixtureArraySchema.parse(json);
  }

  async getOddsSnapshot(
    fixtureId: number,
    params: TimestampedSnapshotParams = {}
  ): Promise<Odds[]> {
    const json = await this.requestJson<unknown>(`/api/odds/snapshot/${fixtureId}`, {
      query: {
        asOf: params.asOf
      }
    });

    return oddsArraySchema.parse(json);
  }

  async getOddsUpdatesForFixture(fixtureId: number): Promise<Odds[]> {
    const json = await this.requestJson<unknown>(`/api/odds/updates/${fixtureId}`);
    return oddsArraySchema.parse(json);
  }

  async getOddsUpdatesForInterval(params: IntervalUpdateParams): Promise<Odds[]> {
    const json = await this.requestJson<unknown>(
      `/api/odds/updates/${params.epochDay}/${params.hourOfDay}/${params.interval}`,
      {
        query: {
          fixtureId: params.fixtureId
        }
      }
    );

    return oddsArraySchema.parse(json);
  }

  async getScoresSnapshot(
    fixtureId: number,
    params: TimestampedSnapshotParams = {}
  ): Promise<Score[]> {
    const json = await this.requestJson<unknown>(`/api/scores/snapshot/${fixtureId}`, {
      query: {
        asOf: params.asOf
      }
    });

    return scoreArraySchema.parse(json);
  }

  async getScoreUpdatesForFixture(fixtureId: number): Promise<Score[]> {
    const json = await this.requestJson<unknown>(`/api/scores/updates/${fixtureId}`);
    return scoreArraySchema.parse(json);
  }

  async getScoreUpdatesForInterval(params: IntervalUpdateParams): Promise<Score[]> {
    const json = await this.requestJson<unknown>(
      `/api/scores/updates/${params.epochDay}/${params.hourOfDay}/${params.interval}`,
      {
        query: {
          fixtureId: params.fixtureId
        }
      }
    );

    return scoreArraySchema.parse(json);
  }

  async getHistoricalScores(fixtureId: number): Promise<Score[]> {
    const json = await this.requestJson<unknown>(`/api/scores/historical/${fixtureId}`);
    return scoreArraySchema.parse(json);
  }

  async getScoreStatValidation(
    params: ScoreStatValidationParams
  ): Promise<ScoresStatValidation> {
    const json = await this.requestJson<unknown>("/api/scores/stat-validation", {
      query: {
        fixtureId: params.fixtureId,
        seq: params.seq,
        statKey: params.statKey,
        statKey2: params.statKey2
      }
    });

    return scoresStatValidationSchema.parse(json);
  }

  async openOddsStream(params: StreamParams = {}): Promise<Response> {
    return this.openStream("/api/odds/stream", params);
  }

  async openScoresStream(params: StreamParams = {}): Promise<Response> {
    return this.openStream("/api/scores/stream", params);
  }

  async *streamOdds(params: StreamParams = {}): AsyncGenerator<Odds> {
    const response = await this.openOddsStream(params);
    for await (const message of readSseMessages(response)) {
      if (message.event === "heartbeat") {
        continue;
      }

      const parsed = parseSseJson<unknown>(message);
      yield oddsSchema.parse(parsed);
    }
  }

  async *streamScores(params: StreamParams = {}): AsyncGenerator<Score> {
    const response = await this.openScoresStream(params);
    for await (const message of readSseMessages(response)) {
      if (message.event === "heartbeat") {
        continue;
      }

      const parsed = parseSseJson<unknown>(message);
      yield scoreSchema.parse(parsed);
    }
  }

  private async openStream(path: string, params: StreamParams): Promise<Response> {
    const response = await this.request(path, {
      accept: "text/event-stream",
      query: {
        fixtureId: params.fixtureId
      },
      credentials: this.credentials,
      method: "GET",
      timeoutMs: 0
    }, params.lastEventId);

    if (!response.ok) {
      throw new Error(`TxLINE stream failed with HTTP ${response.status}`);
    }

    return response;
  }

  private async requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.request(path, options);
    const text = await response.text();

    if (!response.ok) {
      throw new Error(
        `TxLINE request failed with HTTP ${response.status}: ${text || response.statusText}`
      );
    }

    if (!text) {
      return undefined as T;
    }

    return JSON.parse(text) as T;
  }

  private async request(
    path: string,
    options: RequestOptions = {},
    lastEventId?: string
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const timeout =
      timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
    const credentials = options.credentials ?? this.credentials;
    const url = buildUrl(this.baseUrl, path, options.query);

    const headers = new Headers();
    headers.set("Accept", options.accept ?? "application/json");

    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    if (credentials?.jwt) {
      headers.set("Authorization", `Bearer ${credentials.jwt}`);
    }

    if (credentials?.apiToken) {
      headers.set("X-Api-Token", credentials.apiToken);
    }

    if (lastEventId) {
      headers.set("Last-Event-ID", lastEventId);
    }

    try {
      return await this.fetchImpl(url, {
        method: options.method ?? "GET",
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal
      });
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, number | string | undefined>
): string {
  const url = new URL(path, baseUrl);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}
