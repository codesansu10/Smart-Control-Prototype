import { Activity, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useEscapeKey } from "../hooks/useEscapeKey";
import type { ApiMetadata, ExampleScenarioKey, PlantMeasurement } from "../types/smartcontrol";
import { measurementFields, validateMeasurement } from "../utils/measurements";

const exampleScenarios: Array<{ key: ExampleScenarioKey; title: string; description: string }> = [
  {
    key: "ai-anomaly",
    title: "AI-only anomaly",
    description: "All individual rule checks are Normal, but the Isolation Forest identifies an unusual multivariable process relationship."
  },
  {
    key: "rule-warning",
    title: "Rule-based warning",
    description: "A defined operating or maintenance threshold is crossed while the AI model remains Normal."
  },
  {
    key: "normal-operation",
    title: "Normal operation",
    description: "Rule checks and the AI model are both Normal, so routine monitoring can continue."
  }
];

export function MeasurementDrawer(props: {
  initialMeasurement: PlantMeasurement;
  metadata: ApiMetadata;
  onClose: () => void;
  onSubmit: (measurement: PlantMeasurement) => Promise<void>;
  isAnalyzing: boolean;
  loadScenario: (scenario: ExampleScenarioKey) => Promise<void>;
}) {
  const [measurement, setMeasurement] = useState<PlantMeasurement>(props.initialMeasurement);
  const [errors, setErrors] = useState<string[]>([]);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  useEscapeKey(true, props.onClose);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  useEffect(() => {
    setMeasurement(props.initialMeasurement);
  }, [props.initialMeasurement]);

  function setField(key: keyof PlantMeasurement, value: string) {
    setMeasurement((current) => ({ ...current, [key]: key === "maintenance_status" ? value : Number(value) }));
  }

  async function submit() {
    const nextErrors = validateMeasurement(measurement, props.metadata.supported_maintenance_status_values);
    setErrors(nextErrors);
    if (nextErrors.length) {
      return;
    }

    await props.onSubmit(measurement);
  }

  async function useExample(scenario: ExampleScenarioKey) {
    await props.loadScenario(scenario);
    props.onClose();
  }

  const grouped = measurementFields.reduce<Record<string, typeof measurementFields>>((groups, field) => {
    groups[field.group] = groups[field.group] ?? [];
    groups[field.group].push(field);
    return groups;
  }, {});

  return (
    <div className="drawer-backdrop">
      <section className="drawer" role="dialog" aria-modal="true" aria-labelledby="measurement-drawer-title">
        <div className="drawer-header">
          <div>
            <h2 id="measurement-drawer-title">Analyze Measurement</h2>
            <p className="muted">Use examples or submit a custom 19-field measurement to /api/analyze.</p>
          </div>
          <button className="icon-button" type="button" onClick={props.onClose} aria-label="Close analysis drawer">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {errors.length > 0 && (
          <div className="error-box" role="alert">
            {errors.map((error) => <p key={error}>{error}</p>)}
          </div>
        )}

        <section className="panel section-panel">
          <span className="sidebar-label">Load example</span>
          <p className="muted example-explainer">
            AI-only anomaly means thresholds remain Normal but the Isolation Forest detects an unusual relationship. Rule-based warning means a defined threshold leaves the Normal range while the model remains Normal. Normal operation means rules are Normal and the signed Isolation Forest score is at or below zero.
          </p>
          <div className="example-card-grid">
            {exampleScenarios.map((example) => (
              <article className="example-card" key={example.key}>
                <div>
                  <h3>{example.title}</h3>
                  <p>{example.description}</p>
                </div>
                <button
                  className="secondary-button"
                  type="button"
                  aria-label={`Load ${example.title}`}
                  onClick={() => void useExample(example.key)}
                >
                  Load example
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="panel section-panel">
          <span className="sidebar-label">Custom measurement</span>
          {Object.entries(grouped).map(([group, fields]) => (
            <fieldset className="form-section" key={group}>
              <legend><strong>{group}</strong></legend>
              <div className="form-grid">
                {fields.map((field, index) => (
                  <label className="field" key={field.key}>
                    <span>{field.key}</span>
                    {field.key === "maintenance_status" ? (
                      <select value={String(measurement[field.key])} onChange={(event) => setField(field.key, event.target.value)}>
                        {props.metadata.supported_maintenance_status_values.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        ref={index === 0 && group === "Feedstock" ? firstInputRef : undefined}
                        type="number"
                        step="any"
                        value={String(measurement[field.key])}
                        onChange={(event) => setField(field.key, event.target.value)}
                      />
                    )}
                    <small>{field.label}{field.unit ? ` | ${field.unit}` : ""}</small>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <div className="drawer-actions">
            <button className="primary-button" type="button" onClick={() => void submit()} disabled={props.isAnalyzing}>
              {props.isAnalyzing ? <Loader2 size={17} aria-hidden="true" /> : <Activity size={17} aria-hidden="true" />}
              {props.isAnalyzing ? "Analyzing measurement" : "Analyze Measurement"}
            </button>
            <button className="secondary-button" type="button" onClick={props.onClose}>Cancel</button>
          </div>
        </section>
      </section>
    </div>
  );
}
