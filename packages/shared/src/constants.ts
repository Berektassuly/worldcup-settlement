export const TXLINE_BASE_URLS = {
  mainnet: "https://txline.txodds.com",
  devnet: "https://txline-dev.txodds.com"
} as const;

export const TXLINE_FREE_SERVICE_LEVELS = {
  delayed: 1,
  realtime: 12
} as const;

export const SOCCER_GAME_PHASE_IDS = {
  notStarted: 1,
  firstHalf: 2,
  halftime: 3,
  secondHalf: 4,
  finished: 5,
  waitingExtraTime: 6,
  extraTimeFirstHalf: 7,
  extraTimeHalftime: 8,
  extraTimeSecondHalf: 9,
  finishedAfterExtraTime: 10,
  waitingPenalties: 11,
  penalties: 12,
  finishedAfterPenalties: 13,
  interrupted: 14,
  abandoned: 15,
  cancelled: 16,
  coverageCancelled: 17,
  coverageSuspended: 18,
  postponed: 19
} as const;

export const SOCCER_STAT_KEYS = {
  participant1Goals: 1,
  participant2Goals: 2,
  participant1YellowCards: 3,
  participant2YellowCards: 4,
  participant1RedCards: 5,
  participant2RedCards: 6,
  participant1Corners: 7,
  participant2Corners: 8
} as const;
