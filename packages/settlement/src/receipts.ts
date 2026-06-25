import type { PredictionMarket, ResolutionPreview } from "@worldcup-settlement/domain";
import type { Fixture, ScoresStatValidation } from "@worldcup-settlement/shared";

export type SettlementReceiptStatus = "pending" | "verified" | "settled" | "void";

export type SettlementReceipt = {
  readonly id: string;
  readonly status: SettlementReceiptStatus;
  readonly fixture: Fixture;
  readonly market: PredictionMarket;
  readonly resolution: ResolutionPreview;
  readonly proof?: ScoresStatValidation;
  readonly settlementTx?: string;
  readonly createdAt: number;
};
