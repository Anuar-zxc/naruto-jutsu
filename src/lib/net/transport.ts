/**
 * Two ways to link two players by a room code:
 *
 *  - PeerTransport: real online play. WebRTC data channel between the two
 *    browsers (peer-to-peer, low latency); the public PeerJS broker is only
 *    used for the handshake. PeerJS is loaded from a CDN on demand, so it
 *    adds nothing to the game's bundle.
 *  - LocalTransport: BroadcastChannel between tabs of the same browser.
 *    Used for tests and for a same-computer demo (?localnet=1).
 */
export interface Transport {
  send(msg: NetMessage): void;
  onMessage(cb: (msg: NetMessage) => void): void;
  onClose(cb: () => void): void;
  close(): void;
}

export type NetMessage =
  | { t: "hello"; nick: string; hero: string; v: 1 }
  | { t: "ready" }
  | { t: "go" }
  | { t: "hit"; amount: number; jutsu?: string }
  | { t: "hp"; hp: number; max: number }
  | { t: "ko" }
  | { t: "ping" }
  | { t: "bye" };

export type NetError = "taken" | "not-found" | "timeout" | "network";

const PREFIX = "naruto-jutsu-v1-";
const PEERJS_URL = "https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js";
const TIMEOUT_MS = 15000;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newRoomCode(rnd = Math.random): string {
  let s = "";
  for (let i = 0; i < 5; i++) s += ALPHABET[Math.floor(rnd() * ALPHABET.length)];
  return s;
}
export const normalizeCode = (raw: string) =>
  raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);

/** Minimal validation of anything that arrives from the other player. */
export function parseMessage(raw: unknown): NetMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const num = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : null);
  switch (m.t) {
    case "hello":
      return typeof m.nick === "string" && typeof m.hero === "string" ? { t: "hello", nick: m.nick.slice(0, 16), hero: m.hero.slice(0, 32), v: 1 } : null;
    case "ready":
    case "go":
    case "ko":
    case "ping":
    case "bye":
      return { t: m.t };
    case "hit": {
      const a = num(m.amount, 2500);
      return a == null ? null : { t: "hit", amount: a, jutsu: typeof m.jutsu === "string" ? m.jutsu.slice(0, 24) : undefined };
    }
    case "hp": {
      const hp = num(m.hp, 5000);
      const max = num(m.max, 5000);
      return hp == null || !max ? null : { t: "hp", hp, max };
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------- PeerJS ---
interface PeerConn {
  on(ev: "open" | "close" | "error", cb: (e?: unknown) => void): void;
  on(ev: "data", cb: (d: unknown) => void): void;
  send(d: unknown): void;
  close(): void;
  open: boolean;
}
interface PeerLike {
  on(ev: "open", cb: (id: string) => void): void;
  on(ev: "connection", cb: (c: PeerConn) => void): void;
  on(ev: "error", cb: (e: { type?: string }) => void): void;
  connect(id: string, opts?: { reliable?: boolean }): PeerConn;
  destroy(): void;
}
type PeerCtor = new (id?: string, opts?: Record<string, unknown>) => PeerLike;

let peerLib: Promise<PeerCtor> | null = null;
function loadPeer(): Promise<PeerCtor> {
  if (peerLib) return peerLib;
  peerLib = new Promise((resolve, reject) => {
    const w = window as unknown as { Peer?: PeerCtor };
    if (w.Peer) return resolve(w.Peer);
    const s = document.createElement("script");
    s.src = PEERJS_URL;
    s.async = true;
    s.onload = () => (w.Peer ? resolve(w.Peer) : reject(new Error("network")));
    s.onerror = () => {
      peerLib = null;
      reject(new Error("network"));
    };
    document.head.appendChild(s);
  });
  return peerLib;
}

function wrapConn(conn: PeerConn, peer: PeerLike): Transport {
  let onMsg: (m: NetMessage) => void = () => undefined;
  let onClose: () => void = () => undefined;
  let closed = false;
  const fireClose = () => {
    if (closed) return;
    closed = true;
    onClose();
  };
  conn.on("data", (d: unknown) => {
    const m = parseMessage(d);
    if (m) onMsg(m);
  });
  conn.on("close", fireClose);
  conn.on("error", fireClose);
  return {
    send: (m) => {
      if (conn.open) conn.send(m);
    },
    onMessage: (cb) => (onMsg = cb),
    onClose: (cb) => (onClose = cb),
    close: () => {
      closed = true;
      try {
        conn.close();
      } catch {
        /* ignore */
      }
      peer.destroy();
    },
  };
}

function withTimeout<T>(p: Promise<T>, onTimeout: () => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      onTimeout();
      reject(new Error("timeout"));
    }, TIMEOUT_MS);
    p.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      },
    );
  });
}

/** Host a room: resolves once the host is registered; `onJoin` fires when a friend connects. */
export async function hostPeer(code: string, onJoin: (t: Transport) => void): Promise<() => void> {
  const Peer = await loadPeer();
  const peer = new Peer(PREFIX + code, { debug: 0 });
  await withTimeout(
    new Promise<void>((resolve, reject) => {
      peer.on("open", () => resolve());
      peer.on("error", (e) => reject(new Error(e?.type === "unavailable-id" ? "taken" : "network")));
    }),
    () => peer.destroy(),
  );
  let joined = false;
  peer.on("connection", (conn) => {
    if (joined) return conn.close(); // room is full
    conn.on("open", () => {
      joined = true;
      onJoin(wrapConn(conn, peer));
    });
  });
  return () => peer.destroy();
}

export async function joinPeer(code: string): Promise<Transport> {
  const Peer = await loadPeer();
  const peer = new Peer(undefined, { debug: 0 });
  return withTimeout(
    new Promise<Transport>((resolve, reject) => {
      peer.on("error", (e) => reject(new Error(e?.type === "peer-unavailable" ? "not-found" : "network")));
      peer.on("open", () => {
        const conn = peer.connect(PREFIX + code, { reliable: true });
        conn.on("open", () => resolve(wrapConn(conn, peer)));
      });
    }),
    () => peer.destroy(),
  );
}

// --------------------------------------------------------- BroadcastChannel ---
export async function hostLocal(code: string, onJoin: (t: Transport) => void): Promise<() => void> {
  const me = Math.random().toString(36).slice(2);
  const ch = new BroadcastChannel(PREFIX + code);
  let partner: string | null = null;
  let onMsg: (m: NetMessage) => void = () => undefined;
  let onClose: () => void = () => undefined;
  ch.onmessage = (e) => {
    const d = e.data as { from: string; to?: string; hs?: string; m?: unknown };
    if (!d || d.from === me) return;
    if (d.hs === "knock" && !partner) {
      partner = d.from;
      ch.postMessage({ from: me, to: partner, hs: "welcome" });
      onJoin({
        send: (m) => ch.postMessage({ from: me, to: partner, m }),
        onMessage: (cb) => (onMsg = cb),
        onClose: (cb) => (onClose = cb),
        close: () => {
          ch.postMessage({ from: me, to: partner, hs: "close" });
          ch.close();
        },
      });
      return;
    }
    if (d.from !== partner || d.to !== me) return;
    if (d.hs === "close") return onClose();
    const m = parseMessage(d.m);
    if (m) onMsg(m);
  };
  return () => ch.close();
}

export function joinLocal(code: string): Promise<Transport> {
  const me = Math.random().toString(36).slice(2);
  const ch = new BroadcastChannel(PREFIX + code);
  let host: string | null = null;
  let onMsg: (m: NetMessage) => void = () => undefined;
  let onClose: () => void = () => undefined;
  return withTimeout(
    new Promise<Transport>((resolve) => {
      ch.onmessage = (e) => {
        const d = e.data as { from: string; to?: string; hs?: string; m?: unknown };
        if (!d || d.from === me || d.to !== me) return;
        if (d.hs === "welcome" && !host) {
          host = d.from;
          resolve({
            send: (m) => ch.postMessage({ from: me, to: host, m }),
            onMessage: (cb) => (onMsg = cb),
            onClose: (cb) => (onClose = cb),
            close: () => {
              ch.postMessage({ from: me, to: host, hs: "close" });
              ch.close();
            },
          });
          return;
        }
        if (d.from !== host) return;
        if (d.hs === "close") return onClose();
        const m = parseMessage(d.m);
        if (m) onMsg(m);
      };
      ch.postMessage({ from: me, hs: "knock" });
    }),
    () => ch.close(),
  );
}
