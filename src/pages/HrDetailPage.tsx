import { Link, useParams } from "react-router-dom";
import { PageHeader, Card, Badge, Button, KeyValue } from "../components/ui";
import { EMPLOYEES } from "../lib/data";

export function HrDetailPage() {
  const { id } = useParams();
  const emp = EMPLOYEES.find((e) => e.id === id);

  if (!emp) {
    return (
      <>
        <PageHeader eyebrow="Staff" title="Employee not found" />
        <p><Link to="/hr">Back to staff directory</Link></p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={<Link to="/hr">Staff directory</Link>}
        title={emp.name}
        actions={<Button size="sm">Edit record</Button>}
      />

      <div className="split">
        <Card title="Profile">
          <KeyValue
            items={[
              ["Role", emp.role],
              ["Department", emp.department],
              ["Status", <Badge key="s" tone={emp.status === "Active" ? "success" : "warning"}>{emp.status}</Badge>],
              ["Attendance", emp.attendance],
            ]}
          />
        </Card>
        <Card title="Leave balances">
          <table className="table" style={{ margin: "-1px" }}>
            <thead>
              <tr><th>Type</th><th className="table__numeric">Remaining</th></tr>
            </thead>
            <tbody>
              {emp.leaves.map((l) => (
                <tr key={l.type}>
                  <td>{l.type}</td>
                  <td className="table__numeric">{l.remaining}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
