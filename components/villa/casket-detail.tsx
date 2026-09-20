import { COFFIN_SAMPLE_NOTE } from "@/lib/villa-pricing";
import { casketSamplePhoto } from "@/lib/media";
import type { CasketModel } from "@/lib/villa-pricing";

/**
 * The rule-derived sample figure the PDP keeps when a model has no authored
 * gallery (P3 of data/villa-pdp-cms-plan/report.md §5/§6).
 *
 * Imagery is the client's own 2026 photograph chosen by lib/media.ts's rule for
 * this model (cover variant + collection band). The client's photograph set is
 * not reconciled with the sheet's model names — an open client question
 * (lib/client-photos.ts) — so this view captions the photograph with the record's
 * own short label, chips it "Sample photograph" and prints the sheet's one-line
 * illustration label. The long substitution sentence (COFFIN_TIER_NOTE) stays on
 * /products; the PDP's editable description carries the office's own words.
 */
export function CasketSampleFigure({ model }: { model: CasketModel }) {
  const sample = casketSamplePhoto(model);
  return (
    <figure className="casket-sample">
      <div className="casket-sample__media">
        {/* eslint-disable-next-line @next/next/no-img-element -- client sample photo */}
        <img
          src={sample.wide.src}
          srcSet={sample.wide.srcSet}
          width={sample.wide.width}
          height={sample.wide.height}
          sizes="(max-width: 64rem) 92vw, 57rem"
          alt={`Illustrative sample coffin — ${sample.alt}`}
        />
        <span className="casket-sample__chip">Sample photograph</span>
      </div>
      <figcaption className="casket-sample__caption">
        <strong>{sample.label}.</strong> {COFFIN_SAMPLE_NOTE}
      </figcaption>
    </figure>
  );
}
