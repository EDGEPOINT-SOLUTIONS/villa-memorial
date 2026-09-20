import type { ContentSpecs } from "@/lib/content-catalog";

/**
 * The formatted specifications table (report §6). One server render of the whole
 * table — the editor's paging is an editing affordance, not a public one. The
 * first column is the row header (what the spec is), so the table reads for a
 * screen reader as labelled values rather than anonymous cells.
 *
 * A table with no columns prints nothing (never an empty table).
 */
export function SpecsTable({ specs, caption }: { specs: ContentSpecs; caption?: string }) {
  if (specs.columns.length === 0) return null;
  return (
    <div className="table-wrapper" tabIndex={0}>
      <table className="table pdp-specs">
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            {specs.columns.map((column, index) => (
              <th key={index} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {specs.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {specs.columns.map((_, cellIndex) =>
                cellIndex === 0 ? (
                  <th key={cellIndex} scope="row">
                    {row[cellIndex] ?? ""}
                  </th>
                ) : (
                  <td key={cellIndex}>{row[cellIndex] ?? ""}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
