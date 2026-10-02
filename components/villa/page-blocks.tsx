import { ContentBlocks } from "@/components/content/content-blocks";
import type { ContentBlock } from "@/lib/content-catalog";

/**
 * A page document's blocks on its public page (admin plan wave 1).
 *
 * The corner pages (Contact · Memorials · Builder · Facilities · Gallery · Price
 * list) had no block canvas; this is their one render site, so a section the
 * office adds in Pages & content appears on the page it belongs to. Prices are
 * never in a block: `priceOf` resolves nothing here and a price block falls back
 * to its heading + note (the save validator already refuses an unresolvable
 * binding), keeping these pages' own live price reads authoritative.
 */
export function PageBlocks({ blocks }: { blocks: readonly ContentBlock[] }) {
  if (blocks.length === 0) return null;
  return (
    <div className="story-band">
      <div className="container--reading">
        <ContentBlocks blocks={[...blocks]} priceOf={() => null} />
      </div>
    </div>
  );
}
