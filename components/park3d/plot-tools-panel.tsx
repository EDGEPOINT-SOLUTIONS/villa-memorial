"use client";

/**
 * Park3dPlotTools — the 3D view's plot editor, rendered in the shared details
 * panel next to the canvas.
 *
 * It edits the SAME record the map view draws (`lib/park-maps`), which is what
 * makes "plot it in either mode, see it in the other" true rather than a claim.
 * Plots linked to a published Lot are read-only here: their status is owned by
 * the property service, exactly as in the map editor.
 */
import { Button } from "@/components/ui/button";
import { usePark3d } from "@/lib/park-3d/view-store";
import { legendList, legendEntry, type PlotArea } from "@/lib/park-maps";

const STATUSES: Array<PlotArea["status"]> = [
  "available",
  "reserved",
  "sold",
  "occupied",
  "maintenance",
];

export function Park3dPlotTools({
  area,
  onPatch,
  onDelete,
}: {
  area: PlotArea;
  onPatch: (patch: Partial<PlotArea>) => void;
  onDelete: () => void;
}) {
  const legend = legendList();
  const tool = usePark3d((s) => s.tool);
  const setTool = usePark3d((s) => s.setTool);

  if (area.lot_id) {
    return (
      <p className="text-sm text-muted">
        {area.code} is linked to a published lot — its availability is managed by the park
        office, so it can&rsquo;t be edited or deleted here.
      </p>
    );
  }

  return (
    <div className="stack park3d-tools">
      <h4 className="mb-0">Edit this plot</h4>
      <label className="park3d-tools__field">
        <span className="text-sm text-muted">Type</span>
        <select
          value={area.typeId ?? ""}
          aria-label="Plot type"
          onChange={(event) => onPatch({ typeId: event.target.value || undefined })}
        >
          <option value="">Standard (no type)</option>
          {legend.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
      </label>
      <label className="park3d-tools__field">
        <span className="text-sm text-muted">Status</span>
        <select
          value={area.status}
          aria-label="Plot status"
          onChange={(event) => onPatch({ status: event.target.value as PlotArea["status"] })}
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label className="park3d-tools__field">
        <span className="text-sm text-muted">Section · block</span>
        <input
          type="text"
          defaultValue={area.sectionBlock ?? ""}
          aria-label="Section and block text"
          onBlur={(event) => onPatch({ sectionBlock: event.target.value.trim() || undefined })}
        />
      </label>
      <p className="text-sm text-muted">
        In the 3D world: <strong>{legendEntry(area.typeId)?.name ?? "Standard"}</strong> ·{" "}
        {area.status}
      </p>
      <div className="row">
        <Button
          size="sm"
          variant={tool === "move" ? "primary" : "secondary"}
          onClick={() => setTool(tool === "move" ? "inspect" : "move")}
        >
          {tool === "move" ? "Stop moving" : "Move in 3D"}
        </Button>
        <Button size="sm" variant="danger" onClick={onDelete}>
          Delete plot
        </Button>
      </div>
    </div>
  );
}
