export interface Progress {
  earned: Record<string, string>;
  daily: Record<string, string[]>;
}

export const initialProgress: Progress = { earned: {}, daily: {} };

export function today(offset = 0) {
  const day = new Date();
  day.setDate(day.getDate() + offset);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
}

export function readProgress(): Progress {
  try {
    const saved = JSON.parse(localStorage.getItem("ishara:progress") || "null");
    if (saved && typeof saved.earned === "object" && saved.earned && typeof saved.daily === "object" && saved.daily) return saved;
  } catch {
    // Learning works when browser storage is disabled.
  }
  return initialProgress;
}

export function recordActivity(progress: Progress, id: string): Progress {
  const date = today();
  const activities = progress.daily[date] ?? [];
  if (activities.includes(id)) return progress;
  return {
    earned: { ...progress.earned, [id]: progress.earned[id] ?? date },
    daily: { ...progress.daily, [date]: [...activities, id] },
  };
}

export function xpFor(id: string) {
  return id.startsWith("camera:") ? 15 : 30;
}

export function streakFor(progress: Progress) {
  let offset = progress.daily[today()]?.length ? 0 : -1;
  let streak = 0;
  while (progress.daily[today(offset)]?.length) {
    streak++;
    offset--;
  }
  return streak;
}
