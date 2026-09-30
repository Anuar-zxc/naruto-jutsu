import type { BoonId, MutatorId } from "@/lib/game/mutators";
import type { SignId } from "./gestures";
import type { CharacterId } from "@/lib/game/characters";
import type { L } from "./i18n";
import type { Upgrades } from "@/lib/game/profile";
import type { Bonuses } from "@/lib/game/bonuses";
import type { MechId } from "@/lib/game/bosses";
import type { PartyVariant } from "@/lib/game/party";

export type Phase =
  | "IDLE"
  | "CAMERA_CHECK"
  | "READY"
  | "MODE_SELECT"
  | "CHARACTER_SELECT"
  | "CHAPTER_SELECT"
  | "DIALOGUE"
  | "JUTSU_SELECTION"
  | "COUNTDOWN"
  | "PLAYING"
  | "SUCCESS"
  | "JUTSU_CAST"
  | "NEXT_ROUND"
  | "FAILED"
  | "DEFEAT"
  | "TRAINING"
  | "SHOP"
  | "LOBBY"
  | "WAVE_CLEAR"
  | "LAB"
  | "VICTORY";

export type Element = "fire" | "water" | "lightning" | "chakra" | "wind";
export type JutsuId = "HENGE" | "KAWARIMI" | "KAGE_BUNSHIN" | "GOKAKYU" | "CHIDORI" | "RYUKA" | "SUIRYUDAN" | "HOSENKA" | "KUCHIYOSE" | "RASENGAN" | "KIRIN" | "RASENSHURIKEN";

/** What a jutsu does besides its damage — the reason to pick it for your three. */
export type JutsuEffect =
  | { kind: "shield"; hits: number }
  | { kind: "boost"; mult: number }
  | { kind: "burn"; dmg: number; turns: number }
  | { kind: "heal"; hp: number }
  | { kind: "pierce"; perfectMult: number }
  | { kind: "combo"; perCombo: number }
  | { kind: "summon"; dmg: number; turns: number; hits: number }
  | { kind: "execute"; belowPct: number; mult: number }
  | { kind: "recoil"; hp: number }
  | { kind: "none" };

/** Buffs/debuffs active in the current fight. */
export interface Status {
  /** Enemy strikes that will be blocked. */
  shield: number;
  /** Damage multiplier for the NEXT jutsu (1 = none). */
  boost: number;
  burn: { dmg: number; turns: number } | null;
  summon: { dmg: number; turns: number } | null;
}

/** What happened at the end of a round (for the round banner). */
export interface RoundReport {
  burn: number;
  summon: number;
  /** Enemy retaliation damage actually taken (0 if blocked or staggered). */
  retaliation: number;
  blocked: boolean;
  staggered: boolean;
  healed: number;
  /** Chakra the enemy regenerated (Orochimaru). */
  regen?: number;
  id: number;
}
export type GameMode = "story" | "quick" | "training" | "duel" | "survival" | "daily" | "party" | "lab";

/** Boss mechanic state for the current fight. */
export interface MechState {
  id: MechId | null;
  /** Itachi: this round's seals are reversed. */
  genjutsu: boolean;
  /** Kakuzu: element of the previous jutsu. */
  lastEl: Element | null;
  /** Kaguya: the arena has shifted. */
  shifted: boolean;
  /** Last mechanic event (for the announcer). */
  event: { kind: "genjutsu" | "shift" | "shinra" | "repelled" | "regen" | "resisted" | "heart"; id: number } | null;
}

/** Hot-seat party (two players, one camera). */
export interface PartyState {
  variant: PartyVariant;
  heroes: CharacterId[];
  /** Versus: each player's chakra. */
  hp: [number, number];
  max: [number, number];
  /** Whose turn it is (0 = player 1). */
  turn: 0 | 1;
  /** Co-op: the previous successful cast (for team techniques). */
  lastCast: { turn: 0 | 1; jutsu: JutsuId } | null;
  /** Co-op: the team technique of the last cast. */
  team: { id: string; turn: 0 | 1; a: JutsuId; b: JutsuId; eventId: number } | null;
  /** Who won (versus), set at the end. */
  winner: 0 | 1 | null;
  /** Damage dealt by each player. */
  dealt: [number, number];
}

export interface Jutsu {
  id: JutsuId;
  element: Element;
  name: L;
  /** Original Japanese name, romanised. */
  romaji: string;
  kanji: string;
  sequence: SignId[];
  damage: number;
  timeLimitMs: number;
  difficulty: 1 | 2 | 3;
  color: string;
  glow: string;
  effect: JutsuEffect;
  /** e.g. "abridged: first 6 of 44 seals" */
  note?: L;
}

export interface GameStats {
  score: number;
  combo: number;
  maxCombo: number;
  correctSigns: number;
  mistakes: number;
  castCount: number;
  perfectCount: number;
  failedCount: number;
  /** Time actually spent performing seals (ms). */
  playMs: number;
  totalDamage: number;
  /** Mistakes per seal the player was SUPPOSED to make (for the sensei's review). */
  weak: Partial<Record<SignId, number>>;
}

export interface CastResult {
  jutsuId: JutsuId;
  damage: number;
  perfect: boolean;
  speedBonus: number;
  perfectBonus: number;
  /** Short labels for what the effect did, e.g. "shield", "crit". */
  tags: string[];
}

export interface GameState {
  phase: Phase;
  round: number;
  mode: GameMode;
  characterId: CharacterId | null;
  bossId: CharacterId | null;
  /** Story chapter index (0-based), null in quick battle. */
  chapter: number | null;
  dialogue: { part: "intro" | "outro"; index: number } | null;
  bossHp: number;
  bossMaxHp: number;
  /** Player chakra/health: the enemy strikes back when a jutsu fails. */
  playerHp: number;
  playerMaxHp: number;
  /** Damage of the last enemy counter-attack (for the UI). */
  lastEnemyHit: { amount: number; id: number } | null;
  /** Permanent upgrades bought with ryō (from the profile). */
  upgrades: Upgrades;
  /** Online duel: room + opponent. */
  duel: { opponentNick: string; ready: boolean } | null;
  /** The three jutsu chosen for this fight, and which one is up. */
  loadout: JutsuId[];
  slot: number;
  status: Status;
  lastRound: RoundReport | null;
  /** Chakra lost to the last wrong seal (for the UI). */
  lastMistakeCost: { hp: number; ms: number; id: number } | null;
  /** Endless survival: current wave and the ryō banked so far this run. */
  survival: {
    wave: number;
    earned: number;
    lastReward: number;
    healed: number;
    /** Boons offered after the wave just cleared (null once one is picked). */
    offer: BoonId[] | null;
    boons: BoonId[];
    dmgBonus: number;
    timeBonusMs: number;
    rewardMult: number;
    focusMult: number;
  } | null;
  /** Active fight modifiers (Daily Challenge). */
  mutators: MutatorId[];
  /** Dojo (training mode): current target seal, streak and mastered seals. */
  training: { sign: SignId; streak: number; mastered: SignId[]; hits: number } | null;
  jutsuId: JutsuId | null;
  seqIndex: number;
  timeLeftMs: number;
  countdown: number;
  jutsuMistakes: number;
  stats: GameStats;
  lastCast: CastResult | null;
  /** Points awarded by the last correct seal (for the floating "+200" popup). */
  lastPoints: { amount: number; multiplier: number; id: number } | null;
  /** Sage gauge 0..100: fills with clean seals, perfect casts and hits taken; when full the next jutsu is empowered. */
  sage: number;
  /** The player shouted the jutsu's name (speech recognition) — +20% on this cast. */
  shout: boolean;
  /** Clan, talents, eye and weapon — summed. */
  bonuses: Bonuses;
  /** Boss mechanic (Itachi, Kakuzu, Kaguya, Pain, Madara, Orochimaru). */
  mech: MechState;
  /** Party mode (hot seat). */
  party: PartyState | null;
  /** Online duel: two jutsu collided. */
  clash: { mine: JutsuId; theirs: string; absorbed: number; id: number } | null;
  /** Monotonic counter bumped on every seal/mistake so the UI can animate. */
  eventId: number;
}

export type GameAction =
  | { type: "START" }
  | { type: "CAMERA_READY" }
  | { type: "ENTER_SELECTION" }
  | { type: "SELECT_MODE"; mode: GameMode; variant?: PartyVariant }
  | { type: "SET_BONUSES"; bonuses: Bonuses }
  | { type: "SELECT_CHAPTER"; index: number }
  | { type: "DIALOGUE_NEXT" }
  | { type: "DIALOGUE_SKIP" }
  | { type: "STORY_OUTRO" }
  | { type: "BACK_TO_CHAPTERS" }
  | { type: "BACK_TO_MENU" }
  | { type: "SELECT_CHARACTER"; id: CharacterId; bossId?: CharacterId; mutators?: MutatorId[] }
  | { type: "PICK_BOON"; id: BoonId }
  | { type: "CHANGE_CHARACTER" }
  | { type: "SELECT_JUTSU"; id: JutsuId }
  | { type: "TOGGLE_LOADOUT"; id: JutsuId }
  | { type: "SET_UPGRADES"; upgrades: Upgrades }
  | { type: "OPEN_SHOP" }
  | { type: "CLOSE_SHOP" }
  | { type: "DUEL_OPPONENT"; nick: string; heroId: CharacterId }
  | { type: "DUEL_BEGIN" }
  | { type: "REMOTE_HIT"; amount: number; clash?: { mine: JutsuId; theirs: string; absorbed: number } }
  | { type: "REMOTE_HP"; hp: number; max: number }
  | { type: "DUEL_RESULT"; win: boolean }
  | { type: "CONFIRM_LOADOUT" }
  | { type: "SELECT_SLOT"; slot: number }
  | { type: "COUNTDOWN_TICK" }
  | { type: "TICK"; dt: number }
  | { type: "SIGN"; sign: SignId }
  | { type: "MISTAKE"; sign: SignId | null }
  | { type: "SUCCESS_DONE" }
  | { type: "CAST_DONE" }
  | { type: "NEXT_ROUND_DONE" }
  | { type: "RETRY" }
  | { type: "BACK_TO_SELECTION" }
  | { type: "RESTART" }
  | { type: "QUIT" }
  | { type: "NEXT_WAVE"; bossId: CharacterId }
  | { type: "SHOUT" }
  | { type: "TRAIN_SELECT"; sign: SignId }
  | { type: "TRAIN_HIT" };

export type Rank = "S" | "A" | "B" | "C";
