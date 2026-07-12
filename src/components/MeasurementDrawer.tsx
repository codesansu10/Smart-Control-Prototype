import { Activity, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useEscapeKey } from "../hooks/useEscapeKey";
import type { ApiMetadata, PlantMeasurement } from "../types/smartcontrol";
import { measurementFields, validateMeasurement } from "../utils/measurements";

export function MeasurementDrawer(props: {
  initialMeasurement: PlantMeasurement;
  metadata: ApiMetadata;
  onClose: () => void;
  onSubmit: (measurement: PlantMeasurement) => Promise<void>;
  isAnalyzing: boolean;
  loadScenario: (scenario: "latest" | "ai-anomaly" | "critical-rule") => Promise<void>;
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

  async function useExample(scenario: "latest" | "ai-anomaly" | "critical-rule") {
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
            <h2 id="measurement-drawer-title">Analyze measurement</h2>
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
          <div className="drawer-actions" style={{ marginTop: 10 }}>
            <button className="secondary-button" type="button" onClick={() => void useExample("latest")}>Latest measurement</button>
            <button className="secondary-button" type="button" onClick={() => void useExample("ai-anomaly")}>AI-only anomaly example</button>
            <button className="secondary-button" type="button" onClick={() => void useExample("critical-rule")}>Critical rule example</button>
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
              {props.isAnalyzing ? "Analyzing measurement" : "Analyze measurement"}
            </button>
            <button className="secondary-button" type="button" onClick={props.onClose}>Cancel</button>
          </div>
        </section>
      </section>
    </div>
  );
}
