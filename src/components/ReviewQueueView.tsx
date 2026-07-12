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
              <th>Date</th>
              <th>Measurement ID</th>
              <th>Rule status</th>
              <th>AI status</th>
              <th>Possible issue category</th>
              <th>Status</th>
              <th>Operator note</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {props.cases.map((item) => (
              <tr key={item.caseItem.measurementId}>
                <td>{item.record?.date ?? "Unknown"}</td>
                <td>{item.caseItem.measurementId}</td>
                <td>{item.record?.overall_rule_status ?? "Unknown"}</td>
                <td>{item.record?.anomaly_flag ?? "Unknown"}</td>
                <td>{item.record?.possible_issue_category ?? "None"}</td>
                <td>{item.caseItem.status}</td>
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
