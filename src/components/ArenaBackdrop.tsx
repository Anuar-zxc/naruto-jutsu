import type { Location } from "@/lib/game/locations";
import { tr } from "@/lib/i18n";
import { StageScene } from "./StageScenes";

/** Background for a location: licensed artwork or an original SVG scene. */
export function ArenaBackdrop({ location, showName = true }: { location: Location; showName?: boolean }) {
  return (
    <div className="backdrop" key={location.id} aria-hidden>
      {location.image ? <div className="backdrop-img" style={{ backgroundImage: `url(${location.image})` }} /> : location.scene && <StageScene scene={location.scene} />}
      <div className="backdrop-shade" />
      {showName && <div className="stage-name">{tr(location.name)}</div>}
    </div>
  );
}
