import type { HistoryRecord, WorkflowCase } from "../types/smartcontrol";

export function ReviewQueueView(props: {
  cases: Array<{ caseItem: WorkflowCase; record?: HistoryRecord }>;
  onOpenCase: (measurementId: string) => void;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Review queue</h2>
          <p className="muted">Open pending review cases and inspect full model analysis.</p>
        </div>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Measurement ID</th>
              <th>Status</th>
              <th>Expert decision</th>
              <th>Operator note</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {props.cases.map((item) => (
              <tr key={item.caseItem.measurementId}>
                <td>{item.caseItem.measurementId}</td>
                <td>{item.caseItem.status}</td>
                <td>{item.caseItem.expertDecision ?? "Pending"}</td>
                <td>{item.caseItem.note || "-"}</td>
                <td>{new Date(item.caseItem.updatedAt).toLocaleString()}</td>
                <td><button type="button" className="secondary-button" onClick={() => props.onOpenCase(item.caseItem.measurementId)}>Open</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!props.cases.length && <p className="muted">No cases are awaiting expert review</p>}
    </section>
  );
}
