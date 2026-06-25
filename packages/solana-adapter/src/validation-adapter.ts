import type { NormalizedScoreProof } from "@worldcup-settlement/settlement";
import type { ScoresStatValidation } from "@worldcup-settlement/shared";

export type ValidationPredicate =
  | { readonly comparison: "greaterThan"; readonly threshold: number }
  | { readonly comparison: "lessThan"; readonly threshold: number }
  | { readonly comparison: "equalTo"; readonly threshold: number };

export type ValidateStatInput = {
  readonly validation: ScoresStatValidation;
  readonly normalizedProof: NormalizedScoreProof;
  readonly predicate: ValidationPredicate;
  readonly statKey: number;
  readonly statKey2?: number;
};

export type ValidateStatResult = {
  readonly ok: boolean;
  readonly network: "mainnet" | "devnet";
  readonly simulated: boolean;
  readonly signature?: string;
  readonly error?: string;
};

export type TxlineStatValidator = {
  validateStat(input: ValidateStatInput): Promise<ValidateStatResult>;
};
