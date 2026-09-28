import { stageForRound } from "@/lib/game/characters";

/** Stage background for the current round (village → valley → academy, then loops). */
export function ArenaBackdrop({ round, showName = true }: { round: number; showName?: boolean }) {
  const stage = stageForRound(round);
  return (
    <div className="backdrop" key={stage.id} aria-hidden>
      <div className="backdrop-img" style={{ backgroundImage: `url(${stage.image})` }} />
      <div className="backdrop-shade" />
      {showName && <div className="stage-name">{stage.name}</div>}
    </div>
  );
}
