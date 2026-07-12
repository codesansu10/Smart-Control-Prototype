import type { HistoryRecord, PlantMeasurement } from "../types/smartcontrol";

export const measurementFields: Array<{
  key: keyof PlantMeasurement;
  label: string;
  unit: string;
  group: "Feedstock" | "Biological process" | "Gas production and quality" | "Equipment and context";
}> = [
  { key: "feedstock_input_tons", label: "Feedstock input", unit: "t", group: "Feedstock" },
  { key: "carbohydrate_percent", label: "Carbohydrate", unit: "%", group: "Feedstock" },
  { key: "protein_percent", label: "Protein", unit: "%", group: "Feedstock" },
  { key: "fat_percent", label: "Fat", unit: "%", group: "Feedstock" },
  { key: "ph_value", label: "pH", unit: "pH", group: "Biological process" },
  { key: "temperature_c", label: "Temperature", unit: "deg C", group: "Biological process" },
  { key: "oxygen_percent", label: "Oxygen", unit: "%", group: "Biological process" },
  { key: "retention_time_days", label: "Retention time", unit: "days", group: "Biological process" },
  { key: "organic_loading_rate_kg_vs_m3_day", label: "Organic loading rate", unit: "kg VS/m3/day", group: "Biological process" },
  { key: "gas_flow_m3_h", label: "Gas flow", unit: "m3/h", group: "Gas production and quality" },
  { key: "methane_percent", label: "Methane", unit: "%", group: "Gas production and quality" },
  { key: "co2_percent", label: "CO2", unit: "%", group: "Gas production and quality" },
  { key: "h2s_ppm", label: "H2S", unit: "ppm", group: "Gas production and quality" },
  { key: "pressure_bar", label: "Pressure", unit: "bar", group: "Equipment and context" },
  { key: "mixing_speed_rpm", label: "Mixing speed", unit: "rpm", group: "Equipment and context" },
  { key: "pump_runtime_hours", label: "Pump runtime", unit: "h", group: "Equipment and context" },
  { key: "compressor_vibration_mm_s", label: "Compressor vibration", unit: "mm/s", group: "Equipment and context" },
  { key: "outside_temperature_c", label: "Outside temperature", unit: "deg C", group: "Equipment and context" },
  { key: "maintenance_status", label: "Maintenance status", unit: "", group: "Equipment and context" }
];

export function measurementFromHistory(record: HistoryRecord): PlantMeasurement {
  return {
    feedstock_input_tons: record.feedstock_input_tons,
    carbohydrate_percent: record.carbohydrate_percent,
    protein_percent: record.protein_percent,
    fat_percent: record.fat_percent,
    ph_value: record.ph_value,
    temperature_c: record.temperature_c,
    oxygen_percent: record.oxygen_percent,
    retention_time_days: record.retention_time_days,
    organic_loading_rate_kg_vs_m3_day: record.organic_loading_rate_kg_vs_m3_day,
    gas_flow_m3_h: record.gas_flow_m3_h,
    methane_percent: record.methane_percent,
    co2_percent: record.co2_percent,
    h2s_ppm: record.h2s_ppm,
    pressure_bar: record.pressure_bar,
    mixing_speed_rpm: record.mixing_speed_rpm,
    pump_runtime_hours: record.pump_runtime_hours,
    compressor_vibration_mm_s: record.compressor_vibration_mm_s,
    outside_temperature_c: record.outside_temperature_c,
    maintenance_status: record.maintenance_status
  };
}

export function validateMeasurement(measurement: PlantMeasurement, supportedStatuses: string[]): string[] {
  const errors: string[] = [];

  for (const field of measurementFields) {
    const value = measurement[field.key];

    if (field.key === "maintenance_status") {
      const status = String(value).trim().toLowerCase();
      if (!status) {
        errors.push("maintenance_status is required");
      } else if (!supportedStatuses.includes(status)) {
        errors.push(`maintenance_status must be one of: ${supportedStatuses.join(", ")}`);
      }
      continue;
    }

    if (typeof value !== "number" || !Number.isFinite(value)) {
      errors.push(`${field.key} must be a finite number`);
    }
  }

  if (measurement.feedstock_input_tons <= 0) {
    errors.push("feedstock_input_tons must be greater than zero");
  }

  if (measurement.co2_percent <= 0) {
    errors.push("co2_percent must be greater than zero");
  }

  return errors;
}
