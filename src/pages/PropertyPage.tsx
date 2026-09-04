import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Card, Badge, Button, KeyValue } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { MapView, MapLegend } from "../components/MapView";
import { Drawer } from "../components/Drawer";
import { ConfirmDialog } from "../components/Modal";
import { useToast } from "../components/toast";
import { LOTS, type Lot, type LotStatus } from "../lib/data";

type BadgeTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent"
  | "available"
  | "reserved"
  | "sold"
  | "occupied"
  | "maintenance"
  | "transferred";

const statusTone: Record<LotStatus, BadgeTone> = {
  Available: "available",
  Reserved: "reserved",
  Sold: "sold",
  Occupied: "occupied",
  Maintenance: "maintenance",
  Transferred: "transferred",
};

export function PropertyPage() {
  const { toast } = useToast();
  const [lots, setLots] = useState<Lot[]>(LOTS);
  const [view, setView] = useState<"map" | "list">("map");
  const [selected, setSelected] = useState<Lot | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const listColumns: Column<Lot>[] = [
    {
      key: "code",
      label: "Lot",
      render: (l) => (
        <Link to={`/property/${l.id}`} className="table__name">
          {l.code}
        </Link>
      ),
    },
    { key: "section", label: "Section" },
    { key: "block", label: "Block" },
    { key: "price", label: "Price", numeric: true },
    { key: "status", label: "Status", render: (l) => <Badge tone={statusTone[l.status]}>{l.status}</Badge> },
    { key: "owner", label: "Owner", render: (l) => l.owner ?? <span className="muted">—</span> },
  ];

  function addLot(name: string, x: number, y: number) {
    const lot: Lot = {
      id: `lot-${Date.now()}`,
      code: name,
      section: "Unassigned",
      block: "—",
      status: "Available",
      price: "₱ —",
      x: Math.round(x),
      y: Math.round(y),
      history: [{ event: "Point placed by administrator", date: new Date().toISOString().slice(0, 10) }],
    };
    setLots((prev) => [...prev, lot]);
    toast(`Point "${name}" added`, "success");
  }

  function reserve() {
    setConfirmOpen(false);
    setSelected(null);
    toast("Reservation request created", "success");
  }

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Property map"
        actions={
          <>
            <Button
              variant={view === "map" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setView("map")}
            >
              Map
            </Button>
            <Button
              variant={view === "list" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setView("list")}
            >
              List
            </Button>
          </>
        }
      />

      <div style={{ marginBottom: "var(--space-4)" }}>
        <MapLegend />
      </div>

      {view === "map" ? (
        <Card>
          <MapView
            lots={lots}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            editable
            onAdd={addLot}
          />
        </Card>
      ) : (
        <DataTable columns={listColumns} rows={lots} rowKey={(l) => l.id} />
      )}

      <Drawer
        open={selected !== null}
        title={selected ? `Lot ${selected.code}` : ""}
        onClose={() => setSelected(null)}
        footer={
          selected ? (
            <>
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Close
              </Button>
              <Link to={`/property/${selected.id}`}>
                <Button variant="secondary">Full profile</Button>
              </Link>
              <Button variant="accent" onClick={() => setConfirmOpen(true)}>
                Reserve
              </Button>
            </>
          ) : undefined
        }
      >
        {selected ? (
          <div className="stack">
            <Badge tone={statusTone[selected.status]}>{selected.status}</Badge>
            <KeyValue
              items={[
                ["Section", selected.section],
                ["Block", selected.block],
                ["Price", selected.price],
                ["Owner", selected.owner ?? "—"],
              ]}
            />
            <div>
              <div className="field__label" style={{ marginBottom: "var(--space-2)" }}>
                History
              </div>
              {selected.history.map((h) => (
                <div key={h.date} className="small muted">
                  {h.date} · {h.event}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={confirmOpen}
        title="Reserve this lot?"
        message={
          <p>
            You're about to place a reservation hold on <strong>{selected?.code}</strong>. A
            reservation requires a deposit and expires if not completed. This action is recorded
            in the audit trail.
          </p>
        }
        confirmLabel="Reserve lot"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={reserve}
      />
    </>
  );
}
