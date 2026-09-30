/**
 * Game state machine — a pure reducer. No timers, no audio, no DOM:
 * side effects live in GameSession, rendering lives in React.
 *
 *   IDLE → CAMERA_CHECK → READY → MODE_SELECT → CHARACTER_SELECT
 *     story: → CHAPTER_SELECT → DIALOGUE(intro) → JUTSU_SELECTION → … → VICTORY → DIALOGUE(outro) → CHAPTER_SELECT
 *     quick: → JUTSU_SELECTION → …
 *   JUTSU_SELECTION (pick 3 jutsu ONCE per fight) → COUNTDOWN → PLAYING → SUCCESS → JUTSU_CAST
 *     → NEXT_ROUND (burn/summon ticks, enemy retaliation) → COUNTDOWN with the next jutsu of the three …
 *                                                              ↘ VICTORY (enemy HP = 0)
 *   PLAYING → FAILED (time out, enemy strikes) → COUNTDOWN (retry | next jutsu)
 *   any hit that empties the player's chakra → DEFEAT
 */
import type { GameAction, GameState, GameStats, JutsuId, MechState, Phase, Status } from "@/types/game";
import type { SignId } from "@/types/gestures";
import { BOSS, JUTSU, JUTSU_ORDER, LOADOUT_SIZE } from "./jutsu";
import { castResult, pointsForSign } from "./scoring";
import { CHARACTERS, bossFor, damageMultiplier, mentorFor } from "./characters";
import { CHAPTERS, jutsuForChapter, linesFor } from "./story";
import { LOCATIONS, QUICK_ROTATION, type Location } from "./locations";
import { focusMult, hpMult, noUpgrades, powerMult, speedBonusMs, startShields } from "./profile";
import { DAILY_HP, boonOffer, combine, type BoonId } from "./mutators";
import { hasFlag, noBonuses, type Bonuses } from "./bonuses";
import { DIMENSION_TIME, HEART_NEW, HEART_SAME, LIMBO_MULT, SHED_HP, SHINRA_MULT, isGenjutsuRound, isShinraRound, mechFor } from "./bosses";
import { COOP_BOSS_HP, COOP_TEAM_HP, PARTY_COUNTDOWN, PARTY_HP, teamCombo } from "./party";
import { randomBossFor } from "./characters";

const NO_BONUSES = noBonuses();
const NO_UPGRADES = noUpgrades();
/** Party mode is played on one profile by two people: permanent upgrades and gear stay out of it. */
const B = (s: GameState): Bonuses => (s.mode === "party" ? NO_BONUSES : s.bonuses);
const U = (s: GameState) => (s.mode === "party" ? NO_UPGRADES : s.upgrades);
export const emptyMech = (): MechState => ({ id: null, genjutsu: false, lastEl: null, shifted: false, event: null });

/** The seals the player must make right now (Itachi's genjutsu reverses them). */
export function currentSequence(s: GameState): SignId[] {
  if (!s.jutsuId) return [];
  const seq = JUTSU[s.jutsuId].sequence;
  return s.mech.genjutsu ? [...seq].reverse() : seq;
}

/** Online duel: both players start with this much chakra (×10 the solo scale). */
export const DUEL_HP = 1000;
const DUEL_FIGHT: Phase[] = ["JUTSU_SELECTION", "COUNTDOWN", "PLAYING", "SUCCESS", "JUTSU_CAST", "NEXT_ROUND", "FAILED"];

/** Player chakra — the same 1000 scale as enemies, so both health bars read alike. */
export const PLAYER_MAX_HP = 1000;
/** Everything that touches the player's chakra (mistakes, strikes, heals) is ×10 the original 100-point tuning. */
const CHAKRA_SCALE = 10;
/** A wrong seal costs chakra AND time. */
export const MISTAKE_TIME_MS = 1500;
/** Below this share of HP the enemy enrages: hits harder, timers shrink. */
export const RAGE_AT = 0.35;
export const RAGE_MULT = 1.35;
/** Enemy retaliation after a cast = this share of its full strike (a perfect cast staggers it: no retaliation). */
export const RETALIATION = 0.4;

/** Sage gauge: what charges it, and what a full gauge does to the next jutsu. */
export const SAGE_MAX = 100;
export const SAGE_PER_SEAL = 5;
export const SAGE_PERFECT = 10;
export const SAGE_HIT_TAKEN = 10;
export const SAGE_MISTAKE = 10;
export const SAGE_MULT = 1.6;
/** Shouting the jutsu's name while casting. */
export const SHOUT_MULT = 1.2;
const addSage = (v: number, d: number) => Math.max(0, Math.min(SAGE_MAX, v + d));

export const emptyStatus = (): Status => ({ shield: 0, boost: 1, burn: null, summon: null });
/** Seal holds in a row needed to "master" a seal in the dojo. */
export const TRAIN_MASTERY = 3;

export const emptyStats = (): GameStats => ({
  score: 0,
  combo: 0,
  maxCombo: 0,
  correctSigns: 0,
  mistakes: 0,
  castCount: 0,
  perfectCount: 0,
  failedCount: 0,
  playMs: 0,
  totalDamage: 0,
  weak: {},
});

export const initialGameState = (): GameState => ({
  phase: "IDLE",
  round: 1,
  mode: "quick",
  characterId: null,
  bossId: null,
  chapter: null,
  dialogue: null,
  bossHp: BOSS.maxHp,
  bossMaxHp: BOSS.maxHp,
  playerHp: PLAYER_MAX_HP,
  playerMaxHp: PLAYER_MAX_HP,
  lastEnemyHit: null,
  loadout: [],
  slot: 0,
  status: emptyStatus(),
  lastRound: null,
  lastMistakeCost: null,
  upgrades: noUpgrades(),
  duel: null,
  training: null,
  survival: null,
  mutators: [],
  jutsuId: null,
  seqIndex: 0,
  timeLeftMs: 0,
  countdown: 0,
  jutsuMistakes: 0,
  stats: emptyStats(),
  lastCast: null,
  lastPoints: null,
  sage: 0,
  shout: false,
  bonuses: noBonuses(),
  mech: emptyMech(),
  party: null,
  clash: null,
  eventId: 0,
});

/** A fresh state that keeps what the player owns (upgrades, gear). */
const fresh = (s: GameState): GameState => ({ ...initialGameState(), upgrades: s.upgrades, bonuses: s.bonuses });

const ALL_PHASES: Phase[] = [
  "CAMERA_CHECK", "READY", "MODE_SELECT", "CHARACTER_SELECT", "CHAPTER_SELECT", "DIALOGUE", "JUTSU_SELECTION",
  "COUNTDOWN", "PLAYING", "SUCCESS", "JUTSU_CAST", "NEXT_ROUND", "FAILED", "DEFEAT", "TRAINING", "SHOP", "LOBBY", "WAVE_CLEAR", "LAB", "VICTORY",
];

/** Which actions are legal in which phase — anything else is ignored. */
const ALLOWED: Record<GameAction["type"], Phase[]> = {
  START: ["IDLE"],
  CAMERA_READY: ["CAMERA_CHECK"],
  ENTER_SELECTION: ["READY"],
  SELECT_MODE: ["MODE_SELECT"],
  SELECT_CHARACTER: ["CHARACTER_SELECT"],
  CHANGE_CHARACTER: ["JUTSU_SELECTION", "CHAPTER_SELECT"],
  SELECT_CHAPTER: ["CHAPTER_SELECT"],
  DIALOGUE_NEXT: ["DIALOGUE"],
  DIALOGUE_SKIP: ["DIALOGUE"],
  STORY_OUTRO: ["VICTORY"],
  BACK_TO_CHAPTERS: ["JUTSU_SELECTION", "VICTORY", "FAILED", "DEFEAT"],
  BACK_TO_MENU: ["CHARACTER_SELECT", "CHAPTER_SELECT", "JUTSU_SELECTION", "VICTORY", "DEFEAT", "TRAINING", "SHOP", "LOBBY", "LAB"],
  SELECT_JUTSU: ["JUTSU_SELECTION"],
  COUNTDOWN_TICK: ["COUNTDOWN"],
  TICK: ["PLAYING"],
  SIGN: ["PLAYING"],
  MISTAKE: ["PLAYING"],
  SUCCESS_DONE: ["SUCCESS"],
  CAST_DONE: ["JUTSU_CAST"],
  NEXT_ROUND_DONE: ["NEXT_ROUND"],
  RETRY: ["FAILED"],
  BACK_TO_SELECTION: ["FAILED"],
  TOGGLE_LOADOUT: ["JUTSU_SELECTION"],
  CONFIRM_LOADOUT: ["JUTSU_SELECTION"],
  SELECT_SLOT: ["COUNTDOWN", "PLAYING"],
  RESTART: ["VICTORY", "FAILED", "DEFEAT", "JUTSU_SELECTION"],
  QUIT: ALL_PHASES,
  SET_UPGRADES: ["IDLE", ...ALL_PHASES],
  SET_BONUSES: ["IDLE", ...ALL_PHASES],
  OPEN_SHOP: ["MODE_SELECT"],
  CLOSE_SHOP: ["SHOP"],
  DUEL_OPPONENT: ["LOBBY"],
  DUEL_BEGIN: ["JUTSU_SELECTION"],
  REMOTE_HIT: DUEL_FIGHT,
  REMOTE_HP: [...DUEL_FIGHT, "LOBBY"],
  DUEL_RESULT: [...DUEL_FIGHT, "DEFEAT", "VICTORY"],
  NEXT_WAVE: ["WAVE_CLEAR"],
  PICK_BOON: ["WAVE_CLEAR"],
  SHOUT: ["COUNTDOWN", "PLAYING", "SUCCESS"],
  TRAIN_SELECT: ["TRAINING"],
  TRAIN_HIT: ["TRAINING"],
};

export const COUNTDOWN_FROM = 3;

// --- Endless survival ----------------------------------------------------------
/** Every 5th wave is a boss wave: tougher enemy, double reward. */
export const BOSS_WAVE_EVERY = 5;
export const isBossWave = (wave: number) => wave % BOSS_WAVE_EVERY === 0;
/** Enemy chakra for a wave. */
export function waveHp(wave: number): number {
  const base = 650 + (wave - 1) * 110;
  return Math.round(base * (isBossWave(wave) ? 1.6 : 1));
}
/** Ryō paid for clearing a wave (banked immediately — nothing is lost on defeat). */
export function waveReward(wave: number): number {
  const base = 40 + wave * 20;
  return isBossWave(wave) ? base * 2 : base;
}
/** Chakra restored between waves: 20% (a boss wave restores 50% and gives a shield). */
export const waveHeal = (wave: number, max: number) => Math.round(max * (isBossWave(wave) ? 0.5 : 0.2));

export const enraged = (s: GameState) => s.bossHp > 0 && s.bossHp <= s.bossMaxHp * RAGE_AT;

/** Jutsu time limit including the hero's perk (and 15% less while the enemy rages). */
export function timeLimit(s: GameState, base: number): number {
  const bonus = s.characterId ? CHARACTERS[s.characterId].timeBonusMs : 0;
  const run = s.survival?.timeBonusMs ?? 0;
  const mod = combine(s.mutators).timeMult;
  const dim = s.mech.shifted && !hasFlag(B(s), "noDimension") ? DIMENSION_TIME : 1;
  const rage = enraged(s) && s.mode !== "duel" && !(s.party?.variant === "versus") ? 0.85 : 1;
  return Math.max(4000, Math.round((base + bonus + run + speedBonusMs(U(s)) + B(s).timeMs) * mod * rage * dim));
}

/** Chakra a wrong seal costs (grows through the story). */
export function mistakeCost(s: GameState): number {
  let base = 9;
  if (s.mode === "survival" && s.survival) base = Math.min(16, 7 + Math.floor(s.survival.wave / 2));
  if (s.mode === "story" && s.chapter != null) base = 6 + Math.round((s.chapter / Math.max(1, CHAPTERS.length - 1)) * 6);
  base *= CHAKRA_SCALE;
  if (s.mode === "duel" || s.party?.variant === "versus") base = 60;
  return Math.max(1, Math.round(base * focusMult(U(s)) * (1 - B(s).mistake) * combine(s.mutators).mistakeMult * (s.survival?.focusMult ?? 1)));
}

/** Chakra numbers (heal, recoil) scale with the mode: duels run on 1000 chakra. */
const hpScale = (_s: GameState) => CHAKRA_SCALE;

/** How many jutsu the player picks for this fight. */
export const loadoutSize = (s: GameState) => Math.min(LOADOUT_SIZE, availableJutsu(s).length);

function startRound(s0: GameState, slot: number): GameState {
  let s = s0;
  // Party: the player whose turn it is steps up (versus: the other one is the target).
  if (s.party) {
    const t = s.party.turn;
    const p = s.party;
    s = { ...s, characterId: p.heroes[t] };
    if (p.variant === "versus") s = { ...s, bossId: p.heroes[1 - t], playerHp: p.hp[t], playerMaxHp: p.max[t], bossHp: p.hp[1 - t], bossMaxHp: p.max[1 - t] };
  }
  const id = s.loadout[slot % s.loadout.length];
  const j = JUTSU[id];
  const genjutsu = s.mech.id === "tsukuyomi" && isGenjutsuRound(s.round) && !hasFlag(B(s), "noGenjutsu") && j.sequence.length > 1;
  const mech: MechState = { ...s.mech, genjutsu, event: genjutsu ? { kind: "genjutsu", id: s.eventId + 1 } : s.mech.id === "shinra" && isShinraRound(s.round) ? { kind: "shinra", id: s.eventId + 1 } : s.mech.event };
  const next: GameState = { ...s, mech, phase: "COUNTDOWN", shout: false, slot: slot % s.loadout.length, jutsuId: id, seqIndex: 0, countdown: s.party ? PARTY_COUNTDOWN : COUNTDOWN_FROM, jutsuMistakes: 0, eventId: s.eventId + 1 };
  return { ...next, timeLeftMs: timeLimit(next, j.timeLimitMs) };
}

/** Party: hand the camera to the other player. */
function partyNext(s: GameState, lostCombo: boolean): GameState {
  const p = s.party!;
  const hp: [number, number] = [...p.hp];
  if (p.variant === "versus") {
    hp[p.turn] = s.playerHp;
    hp[1 - p.turn] = s.bossHp;
  }
  const party = { ...p, hp, turn: (1 - p.turn) as 0 | 1, lastCast: lostCombo ? null : p.lastCast };
  return startRound({ ...s, party, round: s.round + 1 }, s.slot + 1);
}

/** Enemy hits the player (shield absorbs it). Returns the new state + what happened. */
function enemyHits(s: GameState, amount: number): { s: GameState; taken: number; blocked: boolean } {
  if (amount <= 0) return { s, taken: 0, blocked: false };
  // Madara's Limbo: invisible shadows walk straight past shields.
  if (s.status.shield > 0 && s.mech.id !== "limbo") return { s: { ...s, status: { ...s.status, shield: s.status.shield - 1 } }, taken: 0, blocked: true };
  const taken = Math.min(s.playerHp, Math.max(1, Math.round(amount * (1 - B(s).taken))));
  return { s: { ...s, playerHp: s.playerHp - taken, sage: addSage(s.sage, SAGE_HIT_TAKEN) }, taken, blocked: false };
}

/** Jutsu the player may choose right now. */
export function availableJutsu(s: GameState): JutsuId[] {
  const base = s.mode === "story" && s.chapter != null ? jutsuForChapter(s.chapter) : JUTSU_ORDER;
  const only = combine(s.mutators).elements;
  return only ? base.filter((id) => only.includes(JUTSU[id].element)) : base;
}

/** Where the current fight takes place. */
export function locationFor(s: GameState): Location {
  // Kaguya tore the arena into one of her dimensions.
  if (s.mech.shifted) return LOCATIONS.moon;
  if (s.mode === "story" && s.chapter != null) return LOCATIONS[CHAPTERS[s.chapter].location];
  if (s.mode === "survival" && s.survival) return LOCATIONS[QUICK_ROTATION[(s.survival.wave - 1) % QUICK_ROTATION.length]];
  return LOCATIONS[QUICK_ROTATION[(s.round - 1) % QUICK_ROTATION.length]];
}

/** Dialogue lines for the current dialogue part. */
export function dialogueLines(s: GameState) {
  if (s.chapter == null || !s.dialogue) return [];
  return linesFor(CHAPTERS[s.chapter], s.dialogue.part, s.characterId, s.bossId);
}

/** How hard the enemy hits back when a jutsu fails (grows through the story). */
export function enemyAttack(s: GameState): number {
  let base = s.mode === "story" && s.chapter != null ? 22 + Math.round((s.chapter / Math.max(1, CHAPTERS.length - 1)) * 20) : 34;
  if (s.mode === "survival" && s.survival) {
    const w = s.survival.wave;
    base = Math.min(72, 24 + Math.round(w * 2.5)) * (isBossWave(w) ? 1.2 : 1);
  }
  return Math.round(base * CHAKRA_SCALE * combine(s.mutators).enemyDmgMult * (enraged(s) ? RAGE_MULT : 1) * (s.mech.id === "limbo" ? LIMBO_MULT : 1));
}

function startFight(s: GameState): GameState {
  const heroChakra = (s.characterId && CHARACTERS[s.characterId].chakraMult) || 1;
  const mods = combine(s.mutators);
  const b = B(s);
  const coop = s.party?.variant === "coop";
  const maxHp = s.party ? (coop ? COOP_TEAM_HP : PARTY_HP) : Math.round((s.mode === "duel" ? DUEL_HP : PLAYER_MAX_HP) * hpMult(U(s)) * heroChakra * mods.playerHpMult * (1 + b.hp));
  return {
    ...s,
    mech: { ...emptyMech(), id: mechFor(s.mode, s.bossId) },
    clash: null,
    party: s.party ? { ...s.party, hp: [PARTY_HP, PARTY_HP], max: [PARTY_HP, PARTY_HP], turn: 0, lastCast: null, team: null, winner: null, dealt: [0, 0] } : null,
    phase: "JUTSU_SELECTION",
    round: 1,
    bossHp: s.bossMaxHp,
    playerHp: maxHp,
    playerMaxHp: maxHp,
    lastEnemyHit: null,
    lastRound: null,
    lastMistakeCost: null,
    duel: s.duel ? { ...s.duel, ready: false } : null,
    status: { ...emptyStatus(), shield: startShields(U(s)) + b.shields },
    sage: mods.sageStart ? SAGE_MAX : Math.min(SAGE_MAX, b.sageStart),
    slot: 0,
    // Keep the previous picks (handy for a rematch) if they're still available.
    loadout: s.loadout.filter((id) => availableJutsu(s).includes(id)).slice(0, LOADOUT_SIZE),
    stats: emptyStats(),
    jutsuId: null,
    seqIndex: 0,
    lastCast: null,
    dialogue: null,
  };
}

function endDialogue(s: GameState): GameState {
  if (s.dialogue?.part === "intro") return startFight(s);
  return { ...s, phase: "CHAPTER_SELECT", dialogue: null };
}

const freshRun = (): NonNullable<GameState["survival"]> => ({ wave: 1, earned: 0, lastReward: 0, healed: 0, offer: null, boons: [], dmgBonus: 0, timeBonusMs: 0, rewardMult: 1, focusMult: 1 });

/** Survival: apply the boon picked after a wave. */
function applyBoon(s: GameState, id: BoonId): GameState {
  const sv = { ...s.survival!, offer: null, boons: [...s.survival!.boons, id] };
  let st: GameState = { ...s, survival: sv, eventId: s.eventId + 1 };
  switch (id) {
    case "uzumaki":
      st = { ...st, playerMaxHp: st.playerMaxHp + 200, playerHp: st.playerHp + 200 };
      break;
    case "sennin":
      st = { ...st, sage: addSage(st.sage, 60) };
      break;
    case "ancestors":
      st = { ...st, status: { ...st.status, shield: st.status.shield + 2 } };
      break;
    case "bloodlust":
      sv.dmgBonus += 0.12;
      break;
    case "quickhands":
      sv.timeBonusMs += 1500;
      break;
    case "medic":
      st = { ...st, playerHp: Math.min(st.playerMaxHp, st.playerHp + Math.round(st.playerMaxHp * 0.4)) };
      break;
    case "greed":
      sv.rewardMult += 0.3;
      break;
    case "focus":
      sv.focusMult *= 0.6;
      break;
  }
  return st;
}

/** Survival: the wave's enemy is down — bank the ryō, restore some chakra, wait for the next one. */
function clearWave(s: GameState): GameState {
  const sv = s.survival!;
  const reward = Math.round(waveReward(sv.wave) * sv.rewardMult);
  const heal = Math.min(s.playerMaxHp - s.playerHp, waveHeal(sv.wave, s.playerMaxHp));
  const shield = isBossWave(sv.wave) ? 1 : 0;
  return {
    ...s,
    phase: "WAVE_CLEAR",
    bossHp: 0,
    playerHp: s.playerHp + heal,
    status: { ...s.status, shield: s.status.shield + shield },
    survival: { ...sv, earned: sv.earned + reward, lastReward: reward, healed: heal, offer: boonOffer(sv.wave, s.eventId) },
    eventId: s.eventId + 1,
  };
}

export function gameReducer(s: GameState, a: GameAction): GameState {
  if (!ALLOWED[a.type].includes(s.phase)) return s;

  switch (a.type) {
    case "START":
      return { ...fresh(s), phase: "CAMERA_CHECK" };

    case "CAMERA_READY":
      return { ...s, phase: "READY" };

    case "ENTER_SELECTION":
      return { ...s, phase: "MODE_SELECT" };

    case "SET_UPGRADES":
      return { ...s, upgrades: a.upgrades };

    case "SET_BONUSES":
      return { ...s, bonuses: a.bonuses };

    case "OPEN_SHOP":
      return { ...s, phase: "SHOP" };

    case "CLOSE_SHOP":
      return { ...s, phase: "MODE_SELECT" };

    case "DUEL_OPPONENT":
      if (s.mode !== "duel") return s;
      return startFight({ ...s, bossId: a.heroId, bossHp: DUEL_HP, bossMaxHp: DUEL_HP, duel: { opponentNick: a.nick, ready: false } });

    case "DUEL_BEGIN":
      if (s.mode !== "duel" || s.loadout.length !== loadoutSize(s)) return s;
      return startRound({ ...s, duel: s.duel ? { ...s.duel, ready: true } : s.duel }, 0);

    case "REMOTE_HIT": {
      if (s.mode !== "duel") return s;
      const r = enemyHits(s, Math.max(0, Math.round(a.amount)));
      return {
        ...r.s,
        clash: a.clash ? { ...a.clash, id: s.eventId + 1 } : s.clash,
        lastEnemyHit: r.taken > 0 ? { amount: r.taken, id: s.eventId + 1 } : s.lastEnemyHit,
        lastRound: r.blocked ? { burn: 0, summon: 0, retaliation: 0, blocked: true, staggered: false, healed: 0, id: s.eventId + 1 } : s.lastRound,
        eventId: s.eventId + 1,
        phase: r.s.playerHp <= 0 ? "DEFEAT" : s.phase,
      };
    }

    case "REMOTE_HP":
      if (s.mode !== "duel") return s;
      return { ...s, bossHp: Math.max(0, Math.min(a.max, a.hp)), bossMaxHp: Math.max(1, a.max) };

    case "DUEL_RESULT":
      if (s.mode !== "duel") return s;
      if (s.phase === "VICTORY" || s.phase === "DEFEAT") return s;
      return { ...s, phase: a.win ? "VICTORY" : "DEFEAT", bossHp: a.win ? 0 : s.bossHp };

    case "SELECT_MODE":
      if (a.mode === "training") return { ...s, mode: "training", phase: "TRAINING", training: { sign: "RAT", streak: 0, hits: 0, mastered: [] } };
      if (a.mode === "lab") return { ...s, mode: "lab", phase: "LAB" };
      if (a.mode === "party")
        return {
          ...s,
          mode: "party",
          phase: "CHARACTER_SELECT",
          mutators: [],
          survival: null,
          party: { variant: a.variant ?? "versus", heroes: [], hp: [PARTY_HP, PARTY_HP], max: [PARTY_HP, PARTY_HP], turn: 0, lastCast: null, team: null, winner: null, dealt: [0, 0] },
        };
      return { ...s, mode: a.mode, phase: "CHARACTER_SELECT", mutators: [], survival: null, party: null };

    case "TRAIN_SELECT":
      return { ...s, training: { ...s.training!, sign: a.sign, streak: 0 } };

    case "TRAIN_HIT": {
      const tr = s.training!;
      const streak = tr.streak + 1;
      const mastered = streak >= TRAIN_MASTERY && !tr.mastered.includes(tr.sign) ? [...tr.mastered, tr.sign] : tr.mastered;
      return { ...s, eventId: s.eventId + 1, training: { ...tr, streak, hits: tr.hits + 1, mastered } };
    }

    case "SELECT_CHARACTER":
      if (s.mode === "party" && s.party) {
        // Player 1 picks, then player 2 picks on the same screen.
        if (s.party.heroes.length === 0) return { ...s, party: { ...s.party, heroes: [a.id] }, eventId: s.eventId + 1 };
        const heroes = [s.party.heroes[0], a.id];
        const party = { ...s.party, heroes };
        if (party.variant === "versus") return startFight({ ...s, party, characterId: heroes[0], bossId: heroes[1], bossHp: PARTY_HP, bossMaxHp: PARTY_HP });
        const boss = a.bossId ?? randomBossFor(heroes[0]);
        return startFight({ ...s, party, characterId: heroes[0], bossId: boss, bossHp: COOP_BOSS_HP, bossMaxHp: COOP_BOSS_HP });
      }
      if (s.mode === "story") return { ...s, characterId: a.id, phase: "CHAPTER_SELECT" };
      if (s.mode === "duel") return { ...s, characterId: a.id, phase: "LOBBY", duel: null };
      if (s.mode === "survival") {
        const hp = waveHp(1);
        return startFight({ ...s, characterId: a.id, bossId: a.bossId ?? bossFor(a.id), bossHp: hp, bossMaxHp: hp, mutators: [], survival: freshRun() });
      }
      if (s.mode === "daily") {
        const mutators = a.mutators ?? [];
        const hp = Math.round(DAILY_HP * combine(mutators).enemyHpMult);
        return startFight({ ...s, characterId: a.id, bossId: a.bossId ?? bossFor(a.id), bossHp: hp, bossMaxHp: hp, mutators });
      }
      return startFight({ ...s, characterId: a.id, bossId: a.bossId ?? bossFor(a.id), bossHp: BOSS.maxHp, bossMaxHp: BOSS.maxHp });

    case "CHANGE_CHARACTER":
      return {
        ...fresh(s),
        mode: s.mode,
        phase: "CHARACTER_SELECT",
        party: s.party ? { ...s.party, heroes: [], turn: 0, lastCast: null, team: null, winner: null, dealt: [0, 0] } : null,
      };

    case "SELECT_CHAPTER": {
      const ch = CHAPTERS[a.index];
      if (!ch) return s;
      const bossId = ch.enemy === "mentor" ? mentorFor(s.characterId) : ch.enemy;
      return {
        ...s,
        chapter: a.index,
        bossId,
        bossHp: ch.hp,
        bossMaxHp: ch.hp,
        round: 1,
        stats: emptyStats(),
        phase: "DIALOGUE",
        dialogue: { part: "intro", index: 0 },
      };
    }

    case "DIALOGUE_NEXT": {
      const next = (s.dialogue?.index ?? 0) + 1;
      if (next >= dialogueLines(s).length) return endDialogue(s);
      return { ...s, dialogue: { ...s.dialogue!, index: next } };
    }

    case "DIALOGUE_SKIP":
      return endDialogue(s);

    case "STORY_OUTRO":
      if (s.mode !== "story") return s;
      return { ...s, phase: "DIALOGUE", dialogue: { part: "outro", index: 0 } };

    case "BACK_TO_CHAPTERS":
      if (s.mode !== "story") return s;
      return { ...s, phase: "CHAPTER_SELECT", dialogue: null, jutsuId: null };

    case "BACK_TO_MENU":
      return { ...fresh(s), phase: "MODE_SELECT" };

    case "SELECT_JUTSU": {
      // Shortcut: fight with this jutsu first, the rest of the loadout auto-filled.
      const avail = availableJutsu(s);
      if (!avail.includes(a.id)) return s;
      const rest = [...s.loadout, ...avail].filter((x, i, arr) => x !== a.id && arr.indexOf(x) === i);
      return startRound({ ...s, loadout: [a.id, ...rest].slice(0, loadoutSize(s)) }, 0);
    }

    case "TOGGLE_LOADOUT": {
      if (!availableJutsu(s).includes(a.id)) return s;
      if (s.loadout.includes(a.id)) return { ...s, loadout: s.loadout.filter((x) => x !== a.id) };
      if (s.loadout.length >= loadoutSize(s)) return s;
      return { ...s, loadout: [...s.loadout, a.id] };
    }

    case "CONFIRM_LOADOUT":
      if (s.loadout.length !== loadoutSize(s) || s.loadout.length === 0) return s;
      // Duel: wait for the other player — the session sends DUEL_BEGIN when both are ready.
      if (s.mode === "duel") return { ...s, duel: s.duel ? { ...s.duel, ready: true } : s.duel };
      return startRound(s, 0);

    case "SELECT_SLOT": {
      if (a.slot < 0 || a.slot >= s.loadout.length || a.slot === s.slot) return s;
      if (s.phase === "PLAYING" && s.seqIndex > 0) return s; // committed once the first seal is made
      const j = JUTSU[s.loadout[a.slot]];
      return { ...s, slot: a.slot, jutsuId: j.id, seqIndex: 0, timeLeftMs: timeLimit(s, j.timeLimitMs), jutsuMistakes: 0, eventId: s.eventId + 1 };
    }

    case "COUNTDOWN_TICK": {
      const c = s.countdown - 1;
      return c <= 0 ? { ...s, countdown: 0, phase: "PLAYING" } : { ...s, countdown: c };
    }

    case "TICK": {
      const timeLeftMs = s.timeLeftMs - a.dt;
      const stats = { ...s.stats, playMs: s.stats.playMs + a.dt };
      if (timeLeftMs <= 0 && (s.mode === "duel" || s.party?.variant === "versus")) {
        // Duel: the jutsu fizzles — no AI strike, the other player is busy casting too.
        return { ...s, timeLeftMs: 0, phase: "FAILED", eventId: s.eventId + 1, lastEnemyHit: null, stats: { ...stats, combo: 0, failedCount: stats.failedCount + 1 } };
      }
      if (timeLeftMs <= 0) {
        // The enemy seizes the opening and strikes back (a shield can absorb it).
        const r = enemyHits(s, enemyAttack(s));
        return {
          ...r.s,
          timeLeftMs: 0,
          lastEnemyHit: { amount: r.taken, id: s.eventId + 1 },
          eventId: s.eventId + 1,
          phase: r.s.playerHp <= 0 ? "DEFEAT" : "FAILED",
          stats: { ...stats, combo: 0, failedCount: stats.failedCount + 1 },
        };
      }
      return { ...s, timeLeftMs, stats };
    }


    case "SIGN": {
      const seq = currentSequence(s);
      if (!seq.length || seq[s.seqIndex] !== a.sign) return s;
      const combo = s.stats.combo + 1;
      const pts = pointsForSign(combo);
      const seqIndex = s.seqIndex + 1;
      const stats: GameStats = {
        ...s.stats,
        combo,
        maxCombo: Math.max(s.stats.maxCombo, combo),
        correctSigns: s.stats.correctSigns + 1,
        score: s.stats.score + pts.amount,
      };
      return {
        ...s,
        seqIndex,
        stats,
        sage: addSage(s.sage, SAGE_PER_SEAL + B(s).sageSeal),
        eventId: s.eventId + 1,
        lastPoints: { ...pts, id: s.eventId + 1 },
        phase: seqIndex >= seq.length ? "SUCCESS" : "PLAYING",
      };
    }

    case "MISTAKE": {
      const want = currentSequence(s)[s.seqIndex] ?? null;
      const weak = want ? { ...s.stats.weak, [want]: (s.stats.weak[want] ?? 0) + 1 } : s.stats.weak;
      // A wrong seal backfires: chakra AND time are lost.
      const hp = Math.min(s.playerHp, mistakeCost(s));
      const playerHp = s.playerHp - hp;
      return {
        ...s,
        playerHp,
        timeLeftMs: Math.max(1, s.timeLeftMs - MISTAKE_TIME_MS),
        lastMistakeCost: { hp, ms: MISTAKE_TIME_MS, id: s.eventId + 1 },
        phase: playerHp <= 0 ? "DEFEAT" : s.phase,
        party: playerHp <= 0 && s.party?.variant === "versus" ? { ...s.party, winner: (1 - s.party.turn) as 0 | 1 } : s.party,
        jutsuMistakes: s.jutsuMistakes + 1,
        sage: addSage(s.sage, -SAGE_MISTAKE),
        eventId: s.eventId + 1,
        stats: { ...s.stats, mistakes: s.stats.mistakes + 1, combo: 0, weak },
      };
    }

    case "SUCCESS_DONE": {
      const j = JUTSU[s.jutsuId!];
      const hero = s.characterId ? CHARACTERS[s.characterId] : null;
      const perfect = s.jutsuMistakes === 0;
      const e = j.effect;
      const tags: string[] = [];
      const b = B(s);
      let mult = damageMultiplier(hero, j.element) * powerMult(U(s));
      let status = { ...s.status };
      let playerHp = s.playerHp;
      mult *= combine(s.mutators).playerDmgMult * (1 + (s.survival?.dmgBonus ?? 0));
      mult *= 1 + b.dmg + (b.el[j.element] ?? 0);
      if (perfect && b.perfect) mult *= 1 + b.perfect;
      if (b.execute && s.bossHp <= s.bossMaxHp * RAGE_AT) mult *= 1 + b.execute;
      // Boss mechanics.
      let mech = s.mech;
      if (mech.genjutsu) {
        mult *= 1.15;
        tags.push("genjutsu");
      }
      if (mech.id === "hearts") {
        if (mech.lastEl === j.element) {
          mult *= HEART_SAME;
          tags.push("resisted");
          mech = { ...mech, event: { kind: "resisted", id: s.eventId + 1 } };
        } else if (mech.lastEl) {
          mult *= HEART_NEW;
          tags.push("heart");
          mech = { ...mech, event: { kind: "heart", id: s.eventId + 1 } };
        }
        mech = { ...mech, lastEl: j.element };
      }
      if (mech.id === "shinra" && isShinraRound(s.round) && !perfect && !hasFlag(b, "noShinra")) {
        mult *= SHINRA_MULT;
        tags.push("repelled");
        mech = { ...mech, event: { kind: "repelled", id: s.eventId + 1 } };
      }
      // Co-op party: two different jutsu back-to-back from the two players fuse.
      let party = s.party;
      if (party?.variant === "coop") {
        const prev = party.lastCast;
        const combo = prev && prev.turn !== party.turn ? teamCombo(prev.jutsu, j.id) : null;
        if (combo && prev) {
          mult *= combo.mult;
          tags.push("team");
        }
        party = {
          ...party,
          lastCast: combo ? null : { turn: party.turn, jutsu: j.id },
          team: combo && prev ? { id: combo.id, turn: party.turn, a: prev.jutsu, b: j.id, eventId: s.eventId + 1 } : party.team,
        };
      }
      if (s.shout) {
        mult *= SHOUT_MULT;
        tags.push("shout");
      }
      const sageCast = s.sage >= SAGE_MAX;
      if (sageCast) {
        mult *= SAGE_MULT;
        tags.push("sage");
      }
      if (status.boost > 1) {
        mult *= status.boost;
        tags.push("boosted");
        status.boost = 1;
      }
      if (e.kind === "pierce" && perfect) {
        mult *= e.perfectMult / 1.25; // replaces the normal perfect bonus
        tags.push("crit");
      }
      if (e.kind === "execute" && s.bossHp <= s.bossMaxHp * e.belowPct) {
        mult *= e.mult;
        tags.push("execute");
      }
      const r = castResult(j, s.timeLeftMs, s.jutsuMistakes, mult);
      let damage = r.damage;
      if (e.kind === "combo") {
        damage += e.perCombo * s.stats.combo;
        tags.push("combo");
      }
      if (e.kind === "shield") {
        status.shield += e.hits;
        tags.push("shield");
      }
      if (e.kind === "boost") {
        status.boost = e.mult;
        tags.push("boost");
      }
      if (e.kind === "burn") {
        status.burn = { dmg: Math.round(e.dmg * (1 + b.burn)), turns: e.turns };
        tags.push("burn");
      }
      if (e.kind === "summon") {
        status.summon = { dmg: e.dmg, turns: e.turns };
        status.shield += e.hits;
        tags.push("summon");
      }
      if (e.kind === "heal") {
        playerHp = Math.min(s.playerMaxHp, playerHp + e.hp * hpScale(s));
        tags.push("heal");
      }
      if (e.kind === "recoil") {
        playerHp = Math.max(1, playerHp - e.hp * hpScale(s)); // never kills you on its own
        tags.push("recoil");
      }
      const bossHp = Math.max(0, s.bossHp - damage);
      const dealt = s.bossHp - bossHp;
      if (b.healCast || b.lifesteal) {
        const heal = Math.round(s.playerMaxHp * b.healCast + dealt * b.lifesteal);
        if (heal > 0 && playerHp < s.playerMaxHp) {
          playerHp = Math.min(s.playerMaxHp, playerHp + heal);
          tags.push("drain");
        }
      }
      if (mech.id === "dimension" && !mech.shifted && bossHp > 0 && bossHp <= s.bossMaxHp / 2) mech = { ...mech, shifted: true, event: { kind: "shift", id: s.eventId + 1 } };
      if (party) {
        const d: [number, number] = [...party.dealt];
        d[party.turn] += dealt;
        party = { ...party, dealt: d };
      }
      return {
        ...s,
        phase: "JUTSU_CAST",
        bossHp,
        playerHp,
        status,
        mech,
        party,
        eventId: s.eventId + 1,
        // A full gauge is spent on this cast; otherwise a perfect cast charges it further.
        sage: sageCast ? 0 : addSage(s.sage, r.perfect ? SAGE_PERFECT : 0),
        shout: false,
        lastCast: { jutsuId: j.id, ...r, damage, tags },
        stats: {
          ...s.stats,
          score: s.stats.score + r.speedBonus + r.perfectBonus,
          castCount: s.stats.castCount + 1,
          perfectCount: s.stats.perfectCount + (r.perfect ? 1 : 0),
          totalDamage: s.stats.totalDamage + (s.bossHp - bossHp),
        },
      };
    }

    case "CAST_DONE": {
      const won = (x: GameState): GameState => ({ ...x, phase: "VICTORY", party: x.party ? { ...x.party, winner: x.party.variant === "versus" ? x.party.turn : null } : null });
      if (s.bossHp <= 0 && s.mode === "survival") return clearWave(s);
      if (s.bossHp <= 0 && s.mode !== "duel") return won(s);
      // End of round: damage over time, then the enemy answers.
      let st = s;
      let status = { ...s.status };
      let burn = 0;
      let summon = 0;
      if (status.burn) {
        burn = status.burn.dmg;
        status.burn = status.burn.turns > 1 ? { ...status.burn, turns: status.burn.turns - 1 } : null;
      }
      if (status.summon) {
        summon = status.summon.dmg;
        status.summon = status.summon.turns > 1 ? { ...status.summon, turns: status.summon.turns - 1 } : null;
      }
      let bossHp = Math.max(0, s.bossHp - burn - summon);
      let regen = 0;
      // Orochimaru sheds his skin and recovers a little every round.
      if (s.mech.id === "shedding" && bossHp > 0) {
        regen = Math.min(SHED_HP, s.bossMaxHp - bossHp);
        bossHp += regen;
      }
      let mech = st.mech;
      if (mech.id === "dimension" && !mech.shifted && bossHp > 0 && bossHp <= s.bossMaxHp / 2) mech = { ...mech, shifted: true, event: { kind: "shift", id: s.eventId + 1 } };
      if (regen) mech = { ...mech, event: { kind: "regen", id: s.eventId + 1 } };
      let party = st.party;
      if (party && burn + summon > 0) {
        const d: [number, number] = [...party.dealt];
        d[party.turn] += Math.min(s.bossHp, burn + summon);
        party = { ...party, dealt: d };
      }
      st = { ...st, status, bossHp, mech, party, stats: { ...st.stats, totalDamage: st.stats.totalDamage + Math.max(0, s.bossHp - bossHp) } };
      const report = { burn, summon, retaliation: 0, blocked: false, staggered: false, healed: 0, regen, id: s.eventId + 1 };
      // Duel: the win is decided by the opponent's own client (it reports its KO); no AI retaliation.
      if (s.mode === "duel") return { ...st, phase: "NEXT_ROUND", lastRound: report, eventId: s.eventId + 1 };
      if (bossHp <= 0 && s.mode === "survival") return clearWave({ ...st, lastRound: report, eventId: s.eventId + 1 });
      if (bossHp <= 0) return won({ ...st, lastRound: report, eventId: s.eventId + 1 });
      // Party versus: the other player doesn't strike back — it's their turn next.
      if (s.party?.variant === "versus") return { ...st, phase: "NEXT_ROUND", lastRound: report, eventId: s.eventId + 1 };
      // A perfect jutsu staggers the enemy; otherwise it retaliates.
      if (s.lastCast?.perfect) {
        return { ...st, phase: "NEXT_ROUND", lastRound: { ...report, staggered: true }, eventId: s.eventId + 1 };
      }
      const r = enemyHits(st, Math.round(enemyAttack(st) * RETALIATION));
      return {
        ...r.s,
        phase: r.s.playerHp <= 0 ? "DEFEAT" : "NEXT_ROUND",
        lastRound: { ...report, retaliation: r.taken, blocked: r.blocked },
        lastEnemyHit: r.taken > 0 ? { amount: r.taken, id: s.eventId + 1 } : s.lastEnemyHit,
        eventId: s.eventId + 1,
      };
    }

    case "NEXT_ROUND_DONE":
      if (s.party) return partyNext(s, false);
      return startRound({ ...s, round: s.round + 1 }, s.slot + 1);

    case "RETRY":
      if (s.party) return partyNext(s, true);
      return startRound(s, s.slot);

    case "BACK_TO_SELECTION":
      if (s.party) return partyNext(s, true);
      // "Next jutsu": move on to the next of the three.
      return startRound(s, s.slot + 1);

    case "PICK_BOON":
      if (!s.survival?.offer?.includes(a.id)) return s;
      return applyBoon(s, a.id);

    case "SHOUT":
      if (!s.jutsuId || s.shout) return s;
      return { ...s, shout: true, eventId: s.eventId + 1 };

    case "NEXT_WAVE": {
      if (!s.survival) return s;
      const wave = s.survival.wave + 1;
      const hp = waveHp(wave);
      // Same three jutsu, same (partly restored) chakra; the next enemy steps in.
      return startRound(
        { ...s, bossId: a.bossId, bossHp: hp, bossMaxHp: hp, round: 1, survival: { ...s.survival, wave }, lastRound: null, lastEnemyHit: null, status: { ...s.status, burn: null, summon: null }, eventId: s.eventId + 1 },
        s.slot + 1,
      );
    }

    case "RESTART":
      if (s.mode === "survival") {
        const hp = waveHp(1);
        return startFight({ ...s, bossHp: hp, bossMaxHp: hp, survival: freshRun(), eventId: s.eventId + 1 });
      }
      return startFight({ ...s, bossHp: s.bossMaxHp, eventId: s.eventId + 1 });

    case "QUIT":
      return fresh(s);
  }
}
