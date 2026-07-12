export type DashboardMode = "Basic" | "Advanced";
export type ExampleScenarioKey = "ai-anomaly" | "rule-warning" | "normal-operation";
export type ScenarioKey = "latest" | ExampleScenarioKey | "critical-rule" | "custom";
export type PeriodKey = "7" | "30" | "all";
export type Severity = "Normal" | "Warning" | "Critical";
export type AnomalyFlag = "Normal" | "Anomaly";
export type UserRole = "operator" | "expert";
export type WorkflowModule = "dashboard" | "anomaly-detection" | "monthly-report" | "messages" | "review-queue" | "monthly-report-review";
export type CaseStatus =
  | "Open"
  | "Awaiting expert review"
  | "More data requested"
  | "Anomaly confirmed"
  | "False alarm"
  | "Closed";
export type ExpertDecision = "Anomaly confirmed" | "False alarm" | "Request more data";
export type ConversationType = "general" | "anomaly" | "monthly-report";
export type ReportStatus = "Draft" | "Awaiting expert review" | "Approved" | "Sent";
export type DataSourceState =
  | "Live API connected"
  | "Static historical fallback"
  | "API unavailable"
  | "Current analysis";

export interface AnalysisContext {
  measurementId: string;
  measurementDate: string;
  plantId: string;
  scenarioLabel: string;
  sourceLabel: string;
  submittedAt: string;
}

export interface WorkflowCase {
  measurementId: string;
  note: string;
  status: CaseStatus;
  expertDecision: ExpertDecision | null;
  expertReply: string;
  operatorMeasures: string;
  conversationId: string | null;
  updatedAt: string;
}

export interface MessageEntry {
  id: string;
  sender: "julia" | "bernd" | "system";
  senderLabel: string;
  senderSubLabel: string;
  body: string;
  timestamp: string;
  kind: "text" | "status" | "report-card" | "analysis-card";
}

export interface MessageThread {
  id: string;
  subject: string;
  type: ConversationType;
  measurementId?: string;
  reportingMonth?: string;
  messages: MessageEntry[];
  unreadByOperator: number;
  unreadByExpert: number;
  caseStatus?: CaseStatus;
  reportStatus?: ReportStatus;
  lastActivityAt: string;
}

export interface MonthlyReport {
  month: string;
  status: ReportStatus;
  operatorNote: string;
  expertComment: string;
  conversationId: string | null;
  updatedAt: string;
}

export interface PlantMeasurement {
  feedstock_input_tons: number;
  carbohydrate_percent: number;
  protein_percent: number;
  fat_percent: number;
  ph_value: number;
  temperature_c: number;
  oxygen_percent: number;
  retention_time_days: number;
  organic_loading_rate_kg_vs_m3_day: number;
  gas_flow_m3_h: number;
  methane_percent: number;
  co2_percent: number;
  h2s_ppm: number;
  pressure_bar: number;
  mixing_speed_rpm: number;
  pump_runtime_hours: number;
  compressor_vibration_mm_s: number;
  outside_temperature_c: number;
  maintenance_status: string;
}

export interface RobustMetric {
  value: number | null;
  median: number | null;
  mad: number | null;
  robust_z_score: number | null;
  deviation: "Low deviation" | "Normal" | "High deviation";
}

export interface Diagnostics {
  anomaly_threshold: number;
  anomaly_score_interpretation: string;
  model_contamination: number;
  expected_gas_flow_m3_h: number;
  actual_gas_flow_m3_h: number;
  gas_flow_residual_m3_h: number;
  robust_z_threshold: number;
  robust_metrics: {
    gas_flow_residual: RobustMetric;
    biogas_yield_m3_per_ton: RobustMetric;
    methane_to_co2_ratio: RobustMetric;
    h2s_ppm: RobustMetric;
    compressor_vibration_mm_s: RobustMetric;
    pressure_bar: RobustMetric;
  };
}

export interface AnalysisResult extends PlantMeasurement {
  biogas_yield_m3_per_ton: number;
  methane_to_co2_ratio: number;
  ph_alert: Severity;
  temperature_alert: Severity;
  oxygen_alert: Severity;
  methane_alert: Severity;
  h2s_alert: Severity;
  maintenance_alert: Severity;
  overall_rule_status: Severity;
  anomaly_score: number;
  anomaly_flag: AnomalyFlag;
  expert_review_required: "Yes" | "No";
  trigger_source: string | null;
  possible_issue_category: string | null;
  short_explanation: string;
  recommended_action: string;
  diagnostics?: Diagnostics;
}

export interface HistoryRecord extends AnalysisResult {
  measurement_id: string;
  date: string;
  plant_id: string;
  day_number: number;
  feedstock_type: string;
  season: string;
}

export interface HistoryResponse {
  records: HistoryRecord[];
  metadata: {
    period_start: string | null;
    period_end: string | null;
    raw_record_count: number;
    distinct_date_count: number;
    aggregation_assumptions: string;
  };
}

export interface StaticHistoryPayload {
  metadata: {
    source_workbook: string;
    sheet_name: string;
    row_count: number;
    distinct_date_count: number;
    measurements_per_date: number;
    plant_ids: string[];
    date_range: {
      start: string;
      end: string;
    };
    counts: Record<string, Record<string, number>>;
    aggregation_assumptions: string;
  };
  records: HistoryRecord[];
}

export interface ApiHealth {
  status: "ok";
  model_loaded: boolean;
  interpretation_reference_loaded: boolean;
  history_loaded: boolean;
  model_scope: string;
}

export interface ApiMetadata {
  model_feature_names: string[];
  engineered_feature_names: string[];
  model_feature_names_engineered: string[];
  rule_alert_names: string[];
  rule_thresholds: Record<string, {
    unit: string;
    normal: string;
    warning: string;
    critical: string;
  }>;
  anomaly_threshold: number;
  robust_z_score_threshold: number;
  isolation_forest_contamination: number;
  supported_maintenance_status_values: string[];
  model_scope: string;
  model_limitations: string[];
  dataset_date_range: {
    start: string;
    end: string;
  };
  historical_row_count: number;
}

export interface PeriodKpis {
  averageMethane: number;
  averageBiogasYield: number;
  averageGasFlow: number;
  aiAnomalyRate: number;
  ruleEscalationRate: number;
  expertReviewCount: number;
  maintenanceOverdueCount: number;
}

export interface DailyAggregate {
  date: string;
  count: number;
  ph_value: number;
  temperature_c: number;
  oxygen_percent: number;
  methane_percent: number;
  h2s_ppm: number;
  gas_flow_m3_h: number;
  biogas_yield_m3_per_ton: number;
  pressure_bar: number;
  compressor_vibration_mm_s: number;
  anomaly_score: number;
  min: Partial<Record<ChartMetric, number>>;
  max: Partial<Record<ChartMetric, number>>;
}

export type ChartMetric =
  | "ph_value"
  | "temperature_c"
  | "oxygen_percent"
  | "methane_percent"
  | "h2s_ppm"
  | "gas_flow_m3_h"
  | "biogas_yield_m3_per_ton"
  | "pressure_bar"
  | "compressor_vibration_mm_s"
  | "anomaly_score";
