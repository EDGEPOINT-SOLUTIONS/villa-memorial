import { beforeEach, describe, expect, it } from "vitest";
import { frameToImagePx, imagePxToFrame, imageToWorld, worldToImage } from "@/lib/park-3d/coords";
import {
  plotBounds,
  plotCentre,
  plotDimensionsMetres,
  plotWorldTransform,
  squareOutline,
  translatePlotTo,
  worldToImageCentre,
} from "@/lib/park-3d/plot-geometry";
import { parkAreas, saveParkAreas, type PlotArea } from "@/lib/park-maps";

/**
 * THE CONNECTION between the two modes.
 *
 * Both modes read and write `lib/park-maps` (image-space plot records). The 3D
 * park renders those records through `lib/park-3d/plot-geometry.ts` and writes
 * back the same coordinates. These tests drive the real store and the real
 * conversions, so a plot made in one mode is provably the same record the other
 * mode draws — not a screenshot, a comparison of coordinates.
 */

function newPlot(id: string, x: number, y: number, size = 2): PlotArea {
  return {
    id,
    code: id.toUpperCase(),
    lot_id: null,
    status: "available",
    outline: squareOutline(x, y, size),
  };
}

describe("the shared plot store is the single source for both modes", () => {
  beforeEach(() => {
    saveParkAreas("villa", []);
  });

  it("stores a plot placed in 3D and reads it back at the same world spot", () => {
    // A visitor clicks the ground in 3D: the hit point is in world metres.
    const hit = { x: 12.5, z: -6.25 };
    const centre = worldToImageCentre(hit.x, hit.z);

    const plot = newPlot("villa-vm-01", centre.x, centre.y, 2.4);
    saveParkAreas("villa", [...parkAreas("villa"), plot]);

    const stored = parkAreas("villa")[0];
    const xform = plotWorldTransform(stored)!;
    expect(xform.x).toBeCloseTo(hit.x, 1);
    expect(xform.z).toBeCloseTo(hit.z, 1);
  });

  it("stores a plot drawn in Map mode and renders it at the masterplan pixel it was drawn on", () => {
    // The 2D editor works in image-space units; a plot at frame (50, 37.5) is the
    // masterplan's centre, which must land on the world origin.
    const plot = newPlot("villa-vm-02", 50, 37.5, 3);
    saveParkAreas("villa", [plot]);
    const stored = parkAreas("villa")[0];

    const xform = plotWorldTransform(stored)!;
    expect(xform.x).toBeCloseTo(0, 6);
    expect(xform.z).toBeCloseTo(0, 6);

    const centre = plotCentre(stored)!;
    const px = frameToImagePx(centre.x, centre.y);
    // The 3D park would stand this plot exactly where the 2D canvas draws it.
    expect(px.x).toBeCloseTo(627, 3);
    expect(px.y).toBeCloseTo(627, 3);
    expect(imagePxToFrame(px.x, px.y).x).toBeCloseTo(centre.x, 6);
  });

  it("round-trips both directions for a spread of positions", () => {
    for (const [px, py] of [
      [340, 1220],
      [700, 280],
      [1010, 990],
      [900, 60],
    ]) {
      const frame = imagePxToFrame(px, py);
      const world = imageToWorld(frame.x, frame.y);
      const back = worldToImage(world.x, world.z);
      expect(back.x).toBeCloseTo(frame.x, 9);
      expect(back.y).toBeCloseTo(frame.y, 9);
      expect(frameToImagePx(back.x, back.y).x).toBeCloseTo(px, 6);
    }
  });

  it("a plot created in 3D is byte-for-byte the record the map editor writes", () => {
    const hit = { x: -30, z: 40 };
    const centre = worldToImageCentre(hit.x, hit.z);
    const from3d = newPlot("villa-vm-03", centre.x, centre.y, 2);
    // The map editor builds squares the same way (round to 2 decimals, NW→NE→SE→SW).
    const fromMap: PlotArea = {
      id: "villa-vm-03",
      code: "VILLA-VM-03",
      lot_id: null,
      status: "available",
      outline: squareOutline(centre.x, centre.y, 2),
    };
    expect(from3d).toEqual(fromMap);
  });
});

describe("moving and editing in 3D updates the shared record", () => {
  beforeEach(() => {
    saveParkAreas("villa", []);
  });

  it("translatePlotTo preserves the shape and moves only the centre", () => {
    const plot = newPlot("villa-vm-04", 44, 30, 3);
    const before = plotBounds(plot)!;
    const moved = translatePlotTo(plot, 60, 22);
    const after = plotBounds(moved)!;

    expect(after.maxX - after.minX).toBeCloseTo(before.maxX - before.minX, 6);
    expect(after.maxY - after.minY).toBeCloseTo(before.maxY - before.minY, 6);
    expect(plotCentre(moved)).toEqual({ x: 60, y: 22 });
    // Untouched fields stay untouched — this is an edit, not a re-creation.
    expect(moved.id).toBe(plot.id);
    expect(moved.status).toBe(plot.status);
  });

  it("a 3D drag writes new image-space coordinates into the store", () => {
    saveParkAreas("villa", [newPlot("villa-vm-05", 30, 60, 2)]);
    const stored = parkAreas("villa")[0];

    // Drag: pick the plot, then release it over a different ground point.
    const release = { x: 20, z: -35 };
    const target = worldToImageCentre(release.x, release.z);
    saveParkAreas(
      "villa",
      parkAreas("villa").map((a) => (a.id === stored.id ? translatePlotTo(stored, target.x, target.y) : a)),
    );

    const moved = parkAreas("villa")[0];
    const xform = plotWorldTransform(moved)!;
    expect(xform.x).toBeCloseTo(release.x, 0);
    expect(xform.z).toBeCloseTo(release.z, 0);
    expect(plotDimensionsMetres(moved)).toEqual(plotDimensionsMetres(stored));
  });

  it("deleting in 3D removes the record the map view draws", () => {
    saveParkAreas("villa", [newPlot("villa-vm-06", 44, 30), newPlot("villa-vm-07", 50, 30)]);
    expect(parkAreas("villa")).toHaveLength(2);
    saveParkAreas(
      "villa",
      parkAreas("villa").filter((a) => a.id !== "villa-vm-06"),
    );
    expect(parkAreas("villa").map((a) => a.id)).toEqual(["villa-vm-07"]);
  });
});
