import type { ApiMetadata } from "../types/smartcontrol";

export const fallbackMetadata: ApiMetadata = {
  model_feature_names: [
    "feedstock_input_tons",
    "carbohydrate_percent",
    "protein_percent",
    "fat_percent",
    "ph_value",
    "temperature_c",
    "oxygen_percent",
    "retention_time_days",
    "organic_loading_rate_kg_vs_m3_day",
    "gas_flow_m3_h",
    "methane_percent",
    "co2_percent",
    "h2s_ppm",
    "pressure_bar",
    "mixing_speed_rpm",
    "pump_runtime_hours",
    "compressor_vibration_mm_s",
    "outside_temperature_c"
  ],
  engineered_feature_names: [
    "biogas_yield_m3_per_ton",
    "methane_to_co2_ratio"
  ],
  model_feature_names_engineered: [],
  rule_alert_names: [
    "ph_alert",
    "temperature_alert",
    "oxygen_alert",
    "methane_alert",
    "h2s_alert",
    "maintenance_alert"
  ],
  rule_thresholds: {
    ph: { unit: "pH", normal: "6.8 to 7.5", warning: "6.5 to <6.8 or >7.5 to 7.8", critical: "<6.5 or >7.8" },
    temperature: { unit: "deg C", normal: "35 to 55", warning: "33 to <35 or >55 to 57", critical: "<33 or >57" },
    oxygen: { unit: "%", normal: "<=0.20", warning: ">0.20 to 0.50", critical: ">0.50" },
    methane: { unit: "%", normal: ">=52", warning: "48 to <52", critical: "<48" },
    h2s: { unit: "ppm", normal: "<=800", warning: ">800 to 1000", critical: ">1000" },
    maintenance: { unit: "mixed", normal: "vibration <=5, pressure 1.0 to 1.5, not overdue", warning: "vibration >5 or maintenance_status == overdue", critical: "vibration >7 or pressure <1.0 or pressure >1.5" }
  },
  anomaly_threshold: 0,
  robust_z_score_threshold: 2.5,
  isolation_forest_contamination: 0.01,
  supported_maintenance_status_values: ["none", "recent", "overdue"],
  model_scope: "Plant_01 simulated proof of concept",
  model_limitations: [
    "The supplied model and historical dataset represent one simulated plant, Plant_01.",
    "The Isolation Forest is an unsupervised early-warning model.",
    "A detected anomaly is not a confirmed diagnosis.",
    "The workbook contains historical demonstration data, not a live telemetry stream.",
    "Real deployment requires calibration and validation using actual target-plant data."
  ],
  dataset_date_range: {
    start: "2026-01-01",
    end: "2026-04-30"
  },
  historical_row_count: 600
};
