export function AttentionSummary(props: {
  aiAnomalies: number;
  ruleWarnings: number;
  criticalRuleAlerts: number;
  awaitingReview: number;
}) {
  const cards = [
    { label: "AI anomalies", value: props.aiAnomalies },
    { label: "Rule warnings", value: props.ruleWarnings },
    { label: "Critical rule alerts", value: props.criticalRuleAlerts },
    { label: "Awaiting expert review", value: props.awaitingReview }
  ];

  return (
    <section className="summary-grid" aria-label="Anomaly summary">
      {cards.map((card) => (
        <article key={card.label} className="kpi">
          <span className="muted">{card.label}</span>
          <strong>{card.value}</strong>
        </article>
      ))}
    </section>
  );
}
