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
import type { GameAction, GameState, GameStats, JutsuId, Phase, Status } from "@/types/game";
import { BOSS, JUTSU, JUTSU_ORDER, LOADOUT_SIZE } from "./jutsu";
import { castResult, pointsForSign } from "./scoring";
import { CHARACTERS, bossFor, damageMultiplier, mentorFor } from "./characters";
import { CHAPTERS, jutsuForChapter, linesFor } from "./story";
import { LOCATIONS, QUICK_ROTATION, type Location } from "./locations";
import { focusMult, hpMult, noUpgrades, powerMult, speedBonusMs, startShields } from "./profile";

/** Online duel: both players start with this much chakra (×10 the solo scale). */
export const DUEL_HP = 1000;
const DUEL_FIGHT: Phase[] = ["JUTSU_SELECTION", "COUNTDOWN", "PLAYING", "SUCCESS", "JUTSU_CAST", "NEXT_ROUND", "FAILED"];

export const PLAYER_MAX_HP = 100;
/** A wrong seal costs chakra AND time. */
export const MISTAKE_TIME_MS = 1500;
/** Below this share of HP the enemy enrages: hits harder, timers shrink. */
export const RAGE_AT = 0.35;
export const RAGE_MULT = 1.35;
/** Enemy retaliation after a cast = this share of its full strike (a perfect cast staggers it: no retaliation). */
export const RETALIATION = 0.4;

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
  jutsuId: null,
  seqIndex: 0,
  timeLeftMs: 0,
  countdown: 0,
  jutsuMistakes: 0,
  stats: emptyStats(),
  lastCast: null,
  lastPoints: null,
  eventId: 0,
});

const ALL_PHASES: Phase[] = [
  "CAMERA_CHECK", "READY", "MODE_SELECT", "CHARACTER_SELECT", "CHAPTER_SELECT", "DIALOGUE", "JUTSU_SELECTION",
  "COUNTDOWN", "PLAYING", "SUCCESS", "JUTSU_CAST", "NEXT_ROUND", "FAILED", "DEFEAT", "TRAINING", "SHOP", "LOBBY", "VICTORY",
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
  BACK_TO_MENU: ["CHARACTER_SELECT", "CHAPTER_SELECT", "JUTSU_SELECTION", "VICTORY", "DEFEAT", "TRAINING", "SHOP", "LOBBY"],
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
  SET_UPGRADES: ALL_PHASES,
  OPEN_SHOP: ["MODE_SELECT"],
  CLOSE_SHOP: ["SHOP"],
  DUEL_OPPONENT: ["LOBBY"],
  DUEL_BEGIN: ["JUTSU_SELECTION"],
  REMOTE_HIT: DUEL_FIGHT,
  REMOTE_HP: [...DUEL_FIGHT, "LOBBY"],
  DUEL_RESULT: [...DUEL_FIGHT, "DEFEAT", "VICTORY"],
  TRAIN_SELECT: ["TRAINING"],
  TRAIN_HIT: ["TRAINING"],
};

export const COUNTDOWN_FROM = 3;

export const enraged = (s: GameState) => s.bossHp > 0 && s.bossHp <= s.bossMaxHp * RAGE_AT;

/** Jutsu time limit including the hero's perk (and 15% less while the enemy rages). */
export function timeLimit(s: GameState, base: number): number {
  const bonus = s.characterId ? CHARACTERS[s.characterId].timeBonusMs : 0;
  return Math.max(5000, Math.round((base + bonus + speedBonusMs(s.upgrades)) * (enraged(s) && s.mode !== "duel" ? 0.85 : 1)));
}

/** Chakra a wrong seal costs (grows through the story). */
export function mistakeCost(s: GameState): number {
  let base = 9;
  if (s.mode === "story" && s.chapter != null) base = 6 + Math.round((s.chapter / Math.max(1, CHAPTERS.length - 1)) * 6);
  if (s.mode === "duel") base = 60;
  return Math.max(1, Math.round(base * focusMult(s.upgrades)));
}

/** Chakra numbers (heal, recoil) scale with the mode: duels run on 1000 chakra. */
const hpScale = (s: GameState) => (s.mode === "duel" ? 10 : 1);

/** How many jutsu the player picks for this fight. */
export const loadoutSize = (s: GameState) => Math.min(LOADOUT_SIZE, availableJutsu(s).length);

function startRound(s: GameState, slot: number): GameState {
  const id = s.loadout[slot % s.loadout.length];
  const j = JUTSU[id];
  return { ...s, phase: "COUNTDOWN", slot: slot % s.loadout.length, jutsuId: id, seqIndex: 0, timeLeftMs: timeLimit(s, j.timeLimitMs), countdown: COUNTDOWN_FROM, jutsuMistakes: 0 };
}

/** Enemy hits the player (shield absorbs it). Returns the new state + what happened. */
function enemyHits(s: GameState, amount: number): { s: GameState; taken: number; blocked: boolean } {
  if (amount <= 0) return { s, taken: 0, blocked: false };
  if (s.status.shield > 0) return { s: { ...s, status: { ...s.status, shield: s.status.shield - 1 } }, taken: 0, blocked: true };
  const taken = Math.min(s.playerHp, amount);
  return { s: { ...s, playerHp: s.playerHp - taken }, taken, blocked: false };
}

/** Jutsu the player may choose right now. */
export function availableJutsu(s: GameState): JutsuId[] {
  return s.mode === "story" && s.chapter != null ? jutsuForChapter(s.chapter) : JUTSU_ORDER;
}

/** Where the current fight takes place. */
export function locationFor(s: GameState): Location {
  if (s.mode === "story" && s.chapter != null) return LOCATIONS[CHAPTERS[s.chapter].location];
  return LOCATIONS[QUICK_ROTATION[(s.round - 1) % QUICK_ROTATION.length]];
}

/** Dialogue lines for the current dialogue part. */
export function dialogueLines(s: GameState) {
  if (s.chapter == null || !s.dialogue) return [];
  return linesFor(CHAPTERS[s.chapter], s.dialogue.part, s.characterId, s.bossId);
}

/** How hard the enemy hits back when a jutsu fails (grows through the story). */
export function enemyAttack(s: GameState): number {
  const base = s.mode === "story" && s.chapter != null ? 22 + Math.round((s.chapter / Math.max(1, CHAPTERS.length - 1)) * 20) : 34;
  return Math.round(base * (enraged(s) ? RAGE_MULT : 1));
}

function startFight(s: GameState): GameState {
  const maxHp = Math.round((s.mode === "duel" ? DUEL_HP : PLAYER_MAX_HP) * hpMult(s.upgrades));
  return {
    ...s,
    phase: "JUTSU_SELECTION",
    round: 1,
    bossHp: s.bossMaxHp,
    playerHp: maxHp,
    playerMaxHp: maxHp,
    lastEnemyHit: null,
    lastRound: null,
    lastMistakeCost: null,
    duel: s.duel ? { ...s.duel, ready: false } : null,
    status: { ...emptyStatus(), shield: startShields(s.upgrades) },
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

export function gameReducer(s: GameState, a: GameAction): GameState {
  if (!ALLOWED[a.type].includes(s.phase)) return s;

  switch (a.type) {
    case "START":
      return { ...initialGameState(), phase: "CAMERA_CHECK" };

    case "CAMERA_READY":
      return { ...s, phase: "READY" };

    case "ENTER_SELECTION":
      return { ...s, phase: "MODE_SELECT" };

    case "SET_UPGRADES":
      return { ...s, upgrades: a.upgrades };

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
      return { ...s, mode: a.mode, phase: "CHARACTER_SELECT" };

    case "TRAIN_SELECT":
      return { ...s, training: { ...s.training!, sign: a.sign, streak: 0 } };

    case "TRAIN_HIT": {
      const tr = s.training!;
      const streak = tr.streak + 1;
      const mastered = streak >= TRAIN_MASTERY && !tr.mastered.includes(tr.sign) ? [...tr.mastered, tr.sign] : tr.mastered;
      return { ...s, eventId: s.eventId + 1, training: { ...tr, streak, hits: tr.hits + 1, mastered } };
    }

    case "SELECT_CHARACTER":
      if (s.mode === "story") return { ...s, characterId: a.id, phase: "CHAPTER_SELECT" };
      if (s.mode === "duel") return { ...s, characterId: a.id, phase: "LOBBY", duel: null };
      return startFight({ ...s, characterId: a.id, bossId: a.bossId ?? bossFor(a.id), bossHp: BOSS.maxHp, bossMaxHp: BOSS.maxHp });

    case "CHANGE_CHARACTER":
      return { ...initialGameState(), mode: s.mode, phase: "CHARACTER_SELECT" };

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
      return { ...initialGameState(), phase: "MODE_SELECT" };

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
      if (timeLeftMs <= 0 && s.mode === "duel") {
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
      const j = s.jutsuId ? JUTSU[s.jutsuId] : null;
      if (!j || j.sequence[s.seqIndex] !== a.sign) return s;
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
        eventId: s.eventId + 1,
        lastPoints: { ...pts, id: s.eventId + 1 },
        phase: seqIndex >= j.sequence.length ? "SUCCESS" : "PLAYING",
      };
    }

    case "MISTAKE": {
      const want = s.jutsuId ? JUTSU[s.jutsuId].sequence[s.seqIndex] : null;
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
        jutsuMistakes: s.jutsuMistakes + 1,
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
      let mult = damageMultiplier(hero, j.element) * powerMult(s.upgrades);
      let status = { ...s.status };
      let playerHp = s.playerHp;
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
        status.burn = { dmg: e.dmg, turns: e.turns };
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
      return {
        ...s,
        phase: "JUTSU_CAST",
        bossHp,
        playerHp,
        status,
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
      if (s.bossHp <= 0 && s.mode !== "duel") return { ...s, phase: "VICTORY" };
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
      const bossHp = Math.max(0, s.bossHp - burn - summon);
      st = { ...st, status, bossHp, stats: { ...st.stats, totalDamage: st.stats.totalDamage + (s.bossHp - bossHp) } };
      const report = { burn, summon, retaliation: 0, blocked: false, staggered: false, healed: 0, id: s.eventId + 1 };
      // Duel: the win is decided by the opponent's own client (it reports its KO); no AI retaliation.
      if (s.mode === "duel") return { ...st, phase: "NEXT_ROUND", lastRound: report, eventId: s.eventId + 1 };
      if (bossHp <= 0) return { ...st, phase: "VICTORY", lastRound: report, eventId: s.eventId + 1 };
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
      return startRound({ ...s, round: s.round + 1 }, s.slot + 1);

    case "RETRY":
      return startRound(s, s.slot);

    case "BACK_TO_SELECTION":
      // "Next jutsu": move on to the next of the three.
      return startRound(s, s.slot + 1);

    case "RESTART":
      return startFight({ ...s, bossHp: s.bossMaxHp, eventId: s.eventId + 1 });

    case "QUIT":
      return initialGameState();
  }
}
