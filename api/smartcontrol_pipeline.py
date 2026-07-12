
import joblib
import numpy as np
import warnings

from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


def require_pandas():
    import pandas as pd
    return pd


# ============================================================
# SMARTCONTROL 2.0 - Feature Contracts
# ============================================================

MODEL_FEATURES = [
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
]

ENGINEERED_FEATURES = [
    "biogas_yield_m3_per_ton",
    "methane_to_co2_ratio"
]

MODEL_FEATURES_ENGINEERED = (
    MODEL_FEATURES + ENGINEERED_FEATURES
)

RULE_ALERT_COLUMNS = [
    "ph_alert",
    "temperature_alert",
    "oxygen_alert",
    "methane_alert",
    "h2s_alert",
    "maintenance_alert"
]

ANOMALY_THRESHOLD = 0.0
ROBUST_Z_THRESHOLD = 2.5
MODEL_CONTAMINATION = 0.01
SUPPORTED_MAINTENANCE_STATUSES = [
    "none",
    "recent",
    "overdue"
]

RULE_THRESHOLDS = {
    "ph": {
        "unit": "pH",
        "normal": "6.8 to 7.5",
        "warning": "6.5 to <6.8 or >7.5 to 7.8",
        "critical": "<6.5 or >7.8"
    },
    "temperature": {
        "unit": "deg C",
        "normal": "35 to 55",
        "warning": "33 to <35 or >55 to 57",
        "critical": "<33 or >57"
    },
    "oxygen": {
        "unit": "%",
        "normal": "<=0.20",
        "warning": ">0.20 to 0.50",
        "critical": ">0.50"
    },
    "methane": {
        "unit": "%",
        "normal": ">=52",
        "warning": "48 to <52",
        "critical": "<48"
    },
    "h2s": {
        "unit": "ppm",
        "normal": "<=800",
        "warning": ">800 to 1000",
        "critical": ">1000"
    },
    "maintenance": {
        "unit": "mixed",
        "normal": "vibration <=5, pressure 1.0 to 1.5, not overdue",
        "warning": "vibration >5 or maintenance_status == overdue",
        "critical": "vibration >7 or pressure <1.0 or pressure >1.5"
    }
}


# ============================================================
# SMARTCONTROL 2.0 - Rule-Based Logic
# ============================================================

def get_ph_alert(ph):
    if ph < 6.5 or ph > 7.8:
        return "Critical"
    if 6.5 <= ph < 6.8 or 7.5 < ph <= 7.8:
        return "Warning"
    return "Normal"


def get_temperature_alert(temperature):
    if temperature < 33 or temperature > 57:
        return "Critical"
    if (
        33 <= temperature < 35
        or 55 < temperature <= 57
    ):
        return "Warning"
    return "Normal"


def get_oxygen_alert(oxygen):
    if oxygen > 0.50:
        return "Critical"
    if 0.20 < oxygen <= 0.50:
        return "Warning"
    return "Normal"


def get_methane_alert(methane):
    if methane < 48:
        return "Critical"
    if 48 <= methane < 52:
        return "Warning"
    return "Normal"


def get_h2s_alert(h2s):
    if h2s > 1000:
        return "Critical"
    if 800 < h2s <= 1000:
        return "Warning"
    return "Normal"


def get_maintenance_alert(
    vibration,
    pressure,
    maintenance_status
):
    maintenance_status = str(
        maintenance_status
    ).strip().lower()

    if (
        vibration > 7
        or pressure < 1.0
        or pressure > 1.5
    ):
        return "Critical"

    if (
        vibration > 5
        or maintenance_status == "overdue"
    ):
        return "Warning"

    return "Normal"


def get_overall_rule_status(row):
    alerts = row[RULE_ALERT_COLUMNS].tolist()

    if "Critical" in alerts:
        return "Critical"

    if "Warning" in alerts:
        return "Warning"

    return "Normal"


def apply_rule_based_alerts(df):
    df_rules = df.copy()

    required_columns = [
        "ph_value",
        "temperature_c",
        "oxygen_percent",
        "methane_percent",
        "h2s_ppm",
        "compressor_vibration_mm_s",
        "pressure_bar",
        "maintenance_status"
    ]

    missing_columns = [
        column for column in required_columns
        if column not in df_rules.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing rule input columns: "
            f"{missing_columns}"
        )

    df_rules["ph_alert"] = (
        df_rules["ph_value"].apply(get_ph_alert)
    )

    df_rules["temperature_alert"] = (
        df_rules["temperature_c"].apply(
            get_temperature_alert
        )
    )

    df_rules["oxygen_alert"] = (
        df_rules["oxygen_percent"].apply(
            get_oxygen_alert
        )
    )

    df_rules["methane_alert"] = (
        df_rules["methane_percent"].apply(
            get_methane_alert
        )
    )

    df_rules["h2s_alert"] = (
        df_rules["h2s_ppm"].apply(
            get_h2s_alert
        )
    )

    df_rules["maintenance_alert"] = (
        df_rules.apply(
            lambda row: get_maintenance_alert(
                row["compressor_vibration_mm_s"],
                row["pressure_bar"],
                row["maintenance_status"]
            ),
            axis=1
        )
    )

    df_rules["overall_rule_status"] = (
        df_rules.apply(
            get_overall_rule_status,
            axis=1
        )
    )

    return df_rules


# ============================================================
# SMARTCONTROL 2.0 - Feature Engineering
# ============================================================

def add_engineered_features(df):
    df_features = df.copy()

    if (
        df_features["feedstock_input_tons"] <= 0
    ).any():
        raise ValueError(
            "feedstock_input_tons must be greater than zero."
        )

    if (
        df_features["co2_percent"] <= 0
    ).any():
        raise ValueError(
            "co2_percent must be greater than zero."
        )

    df_features["biogas_yield_m3_per_ton"] = (
        df_features["gas_flow_m3_h"]
        / df_features["feedstock_input_tons"]
    )

    df_features["methane_to_co2_ratio"] = (
        df_features["methane_percent"]
        / df_features["co2_percent"]
    )

    return df_features


def prepare_model_input(
    df,
    use_engineered_features=True
):
    pd = require_pandas()
    df_prepared = df.copy()

    if use_engineered_features:
        df_prepared = add_engineered_features(
            df_prepared
        )

        selected_features = (
            MODEL_FEATURES_ENGINEERED
        )
    else:
        selected_features = MODEL_FEATURES

    missing_columns = [
        column for column in selected_features
        if column not in df_prepared.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing required model columns: "
            f"{missing_columns}"
        )

    X_model = df_prepared[
        selected_features
    ].copy()

    for column in selected_features:
        X_model[column] = pd.to_numeric(
            X_model[column],
            errors="raise"
        )

    missing_values = X_model.isnull().sum()

    if missing_values.sum() > 0:
        raise ValueError(
            "Missing values found in model input:\n"
            f"{missing_values[missing_values > 0]}"
        )

    return X_model


# ============================================================
# SMARTCONTROL 2.0 - Isolation Forest
# ============================================================

def train_isolation_forest(
    df,
    contamination=0.01,
    random_state=42
):
    X_model = prepare_model_input(
        df,
        use_engineered_features=True
    )

    pipeline = Pipeline([
        (
            "scaler",
            StandardScaler()
        ),
        (
            "model",
            IsolationForest(
                n_estimators=100,
                contamination=contamination,
                random_state=random_state
            )
        )
    ])

    pipeline.fit(X_model)

    return pipeline


def predict_anomalies(
    df,
    trained_pipeline
):
    df_output = add_engineered_features(df)

    X_model = prepare_model_input(
        df,
        use_engineered_features=True
    )

    predictions = trained_pipeline.predict(
        X_model
    )

    anomaly_scores = (
        -trained_pipeline.decision_function(
            X_model
        )
    )

    df_output["anomaly_score"] = (
        anomaly_scores
    )

    df_output["anomaly_flag"] = [
        "Anomaly" if prediction == -1
        else "Normal"
        for prediction in predictions
    ]

    return df_output


# ============================================================
# SMARTCONTROL 2.0 - Interpretation Reference
# ============================================================

def calculate_robust_statistics(series):
    median = series.median()

    mad = np.median(
        np.abs(series - median)
    )

    if mad == 0:
        mad = 1e-9

    return {
        "median": median,
        "mad": mad
    }


def calculate_robust_z_score(
    value,
    statistics
):
    return (
        0.6745
        * (
            value - statistics["median"]
        )
        / statistics["mad"]
    )


def fit_interpretation_reference(df):
    df_reference = add_engineered_features(df)

    normal_rows = df_reference[
        (
            df_reference[
                "overall_rule_status"
            ] == "Normal"
        )
        & (
            df_reference[
                "anomaly_flag"
            ] == "Normal"
        )
    ].copy()

    if normal_rows.empty:
        raise ValueError(
            "No normal observations are available "
            "for interpretation."
        )

    gas_input_features = [
        "feedstock_input_tons",
        "organic_loading_rate_kg_vs_m3_day"
    ]

    gas_flow_model = LinearRegression()

    gas_flow_model.fit(
        normal_rows[gas_input_features],
        normal_rows["gas_flow_m3_h"]
    )

    expected_gas_flow = gas_flow_model.predict(
        normal_rows[gas_input_features]
    )

    gas_flow_residuals = (
        normal_rows["gas_flow_m3_h"]
        - expected_gas_flow
    )

    return {
        "gas_flow_model":
            gas_flow_model,

        "gas_input_features":
            gas_input_features,

        "gas_flow_residual_statistics":
            calculate_robust_statistics(
                gas_flow_residuals
            ),

        "biogas_yield_statistics":
            calculate_robust_statistics(
                normal_rows[
                    "biogas_yield_m3_per_ton"
                ]
            ),

        "methane_to_co2_statistics":
            calculate_robust_statistics(
                normal_rows[
                    "methane_to_co2_ratio"
                ]
            ),

        "h2s_statistics":
            calculate_robust_statistics(
                normal_rows["h2s_ppm"]
            ),

        "vibration_statistics":
            calculate_robust_statistics(
                normal_rows[
                    "compressor_vibration_mm_s"
                ]
            ),

        "pressure_statistics":
            calculate_robust_statistics(
                normal_rows["pressure_bar"]
            )
    }


# ============================================================
# SMARTCONTROL 2.0 - Dashboard Interpretation
# ============================================================

def get_trigger_source(row):
    rule_triggered = (
        row["overall_rule_status"]
        in ["Warning", "Critical"]
    )

    ai_triggered = (
        row["anomaly_flag"] == "Anomaly"
    )

    if rule_triggered and ai_triggered:
        return "Rule-Based and AI"

    if rule_triggered:
        return "Rule-Based"

    if ai_triggered:
        return "Isolation Forest"

    return "None"


def get_rule_explanations(row):
    explanations = []
    categories = []

    alert_definitions = [
        (
            "ph_alert",
            "pH is approaching the unsafe operating range",
            "pH is outside the safe operating range",
            "Biological Process"
        ),
        (
            "temperature_alert",
            "Digester temperature is approaching the unsafe range",
            "Digester temperature is outside the safe operating range",
            "Biological Process"
        ),
        (
            "oxygen_alert",
            "Oxygen concentration is elevated for anaerobic operation",
            "Oxygen concentration is critically high",
            "Biological Process"
        ),
        (
            "methane_alert",
            "Methane concentration is below the normal operating level",
            "Methane concentration is critically low",
            "Gas Quality"
        ),
        (
            "h2s_alert",
            "H2S concentration is approaching the critical range",
            "H2S concentration exceeds the critical threshold",
            "Gas Quality"
        ),
        (
            "maintenance_alert",
            "Equipment condition requires maintenance review",
            "Equipment condition requires immediate inspection",
            "Equipment"
        )
    ]

    for (
        column,
        warning_message,
        critical_message,
        category
    ) in alert_definitions:

        if row[column] == "Warning":
            explanations.append(
                warning_message
            )
            categories.append(category)

        elif row[column] == "Critical":
            explanations.append(
                critical_message
            )
            categories.append(category)

    return explanations, categories


def get_ai_anomaly_explanations(
    row,
    interpretation_reference
):
    if row["anomaly_flag"] != "Anomaly":
        return [], []

    scored_reasons = []

    expected_gas_flow = predict_expected_gas_flow(
        row,
        interpretation_reference
    )

    gas_flow_residual = (
        row["gas_flow_m3_h"]
        - expected_gas_flow
    )

    gas_flow_z = calculate_robust_z_score(
        gas_flow_residual,
        interpretation_reference[
            "gas_flow_residual_statistics"
        ]
    )

    yield_z = calculate_robust_z_score(
        row["biogas_yield_m3_per_ton"],
        interpretation_reference[
            "biogas_yield_statistics"
        ]
    )

    methane_co2_z = calculate_robust_z_score(
        row["methane_to_co2_ratio"],
        interpretation_reference[
            "methane_to_co2_statistics"
        ]
    )

    h2s_z = calculate_robust_z_score(
        row["h2s_ppm"],
        interpretation_reference[
            "h2s_statistics"
        ]
    )

    vibration_z = calculate_robust_z_score(
        row["compressor_vibration_mm_s"],
        interpretation_reference[
            "vibration_statistics"
        ]
    )

    pressure_z = calculate_robust_z_score(
        row["pressure_bar"],
        interpretation_reference[
            "pressure_statistics"
        ]
    )

    def add_reason(
        score,
        explanation,
        category
    ):
        scored_reasons.append({
            "score": abs(score),
            "explanation": explanation,
            "category": category
        })

    if gas_flow_z < -2.5:
        add_reason(
            gas_flow_z,
            "Gas flow is unusually low relative to feedstock input and organic loading",
            "Process Efficiency"
        )

    elif gas_flow_z > 2.5:
        add_reason(
            gas_flow_z,
            "Gas flow is unusually high relative to feedstock input and organic loading",
            "Process Efficiency"
        )

    if yield_z < -2.5:
        add_reason(
            yield_z,
            "Biogas yield per ton of feedstock is unusually low",
            "Process Efficiency"
        )

    elif yield_z > 2.5:
        add_reason(
            yield_z,
            "Biogas yield per ton of feedstock is unusually high",
            "Process Efficiency"
        )

    if methane_co2_z < -2.5:
        add_reason(
            methane_co2_z,
            "The methane-to-CO2 ratio is unusually low",
            "Gas Quality"
        )

    elif methane_co2_z > 2.5:
        add_reason(
            methane_co2_z,
            "The methane-to-CO2 ratio is unusually high",
            "Gas Quality"
        )

    if h2s_z > 2.5:
        add_reason(
            h2s_z,
            "H2S is unusually elevated compared with normal plant behaviour",
            "Gas Quality"
        )

    if vibration_z > 2.5:
        add_reason(
            vibration_z,
            "Compressor vibration is unusually high compared with normal equipment behaviour",
            "Equipment"
        )

    if abs(pressure_z) > 2.5:
        pressure_direction = (
            "high" if pressure_z > 0
            else "low"
        )

        add_reason(
            pressure_z,
            f"System pressure is unusually {pressure_direction} compared with normal plant behaviour",
            "Equipment"
        )

    if not scored_reasons:
        return (
            [
                "The combined process pattern is unusual despite all individual rule thresholds remaining normal"
            ],
            [
                "Multivariate Process Anomaly"
            ]
        )

    scored_reasons = sorted(
        scored_reasons,
        key=lambda item: item["score"],
        reverse=True
    )

    top_reasons = scored_reasons[:2]

    explanations = [
        item["explanation"]
        for item in top_reasons
    ]

    categories = list(
        dict.fromkeys(
            item["category"]
            for item in top_reasons
        )
    )

    return explanations, categories


def interpret_dashboard_row(
    row,
    interpretation_reference
):
    trigger_source = get_trigger_source(row)

    (
        rule_explanations,
        rule_categories
    ) = get_rule_explanations(row)

    (
        ai_explanations,
        ai_categories
    ) = get_ai_anomaly_explanations(
        row,
        interpretation_reference
    )

    explanations = (
        rule_explanations
        + ai_explanations
    )

    categories = list(
        dict.fromkeys(
            rule_categories
            + ai_categories
        )
    )

    short_explanation = (
        "; ".join(explanations)
        if explanations
        else "No alert or unusual process pattern detected"
    )

    possible_issue_category = (
        " / ".join(categories)
        if categories
        else "None"
    )

    expert_review_required = (
        "Yes"
        if trigger_source != "None"
        else "No"
    )

    if row["overall_rule_status"] == "Critical":
        recommended_action = (
            "Immediate expert review recommended"
        )

    elif trigger_source == "Isolation Forest":
        recommended_action = (
            "Review the unusual process relationship "
            "and compare it with recent operating history"
        )

    elif trigger_source in [
        "Rule-Based",
        "Rule-Based and AI"
    ]:
        recommended_action = (
            "Expert review recommended for the "
            "identified process or equipment condition"
        )

    else:
        recommended_action = (
            "Continue routine monitoring"
        )

    return {
        "expert_review_required":
            expert_review_required,

        "trigger_source":
            trigger_source,

        "possible_issue_category":
            possible_issue_category,

        "short_explanation":
            short_explanation,

        "recommended_action":
            recommended_action
    }


def add_dashboard_interpretation(
    df,
    interpretation_reference
):
    pd = require_pandas()
    df_dashboard = add_engineered_features(df)

    interpretation_columns = (
        df_dashboard.apply(
            lambda row: pd.Series(
                interpret_dashboard_row(
                    row,
                    interpretation_reference
                )
            ),
            axis=1
        )
    )

    return pd.concat(
        [
            df_dashboard,
            interpretation_columns
        ],
        axis=1
    )


def native_number(value):
    """
    Convert NumPy scalar values to JSON-friendly Python numbers.
    """

    if isinstance(value, np.generic):
        value = value.item()

    if value is None:
        return None

    if isinstance(value, float) and np.isnan(value):
        return None

    if isinstance(value, (int, float)):
        return float(value)

    return value


def numeric_model_array(row, selected_features):
    values = []
    for feature in selected_features:
        if feature not in row:
            raise ValueError(
                f"Missing required model column: {feature}"
            )
        values.append(float(row[feature]))

    return np.array([values], dtype=float)


def predict_with_feature_order(model, row, selected_features):
    model_input = numeric_model_array(row, selected_features)

    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        return model.predict(model_input)


def decision_function_with_feature_order(model, row, selected_features):
    model_input = numeric_model_array(row, selected_features)

    with warnings.catch_warnings():
        warnings.simplefilter("ignore", UserWarning)
        return model.decision_function(model_input)


def predict_expected_gas_flow(row, interpretation_reference):
    gas_features = interpretation_reference[
        "gas_input_features"
    ]

    return predict_with_feature_order(
        interpretation_reference["gas_flow_model"],
        row,
        gas_features
    )[0]


def classify_robust_deviation(z_score):
    if z_score < -ROBUST_Z_THRESHOLD:
        return "Low deviation"

    if z_score > ROBUST_Z_THRESHOLD:
        return "High deviation"

    return "Normal"


def build_robust_metric(value, statistics):
    robust_z_score = calculate_robust_z_score(
        value,
        statistics
    )

    return {
        "value": native_number(value),
        "median": native_number(statistics["median"]),
        "mad": native_number(statistics["mad"]),
        "robust_z_score": native_number(robust_z_score),
        "deviation": classify_robust_deviation(
            robust_z_score
        )
    }


def build_interpretation_diagnostics(
    row,
    interpretation_reference
):
    """
    Return transparent model-interpretation diagnostics without changing
    the existing human-readable dashboard interpretation.
    """

    expected_gas_flow = predict_expected_gas_flow(
        row,
        interpretation_reference
    )

    gas_flow_residual = (
        row["gas_flow_m3_h"]
        - expected_gas_flow
    )

    robust_metrics = {
        "gas_flow_residual": build_robust_metric(
            gas_flow_residual,
            interpretation_reference[
                "gas_flow_residual_statistics"
            ]
        ),
        "biogas_yield_m3_per_ton": build_robust_metric(
            row["biogas_yield_m3_per_ton"],
            interpretation_reference[
                "biogas_yield_statistics"
            ]
        ),
        "methane_to_co2_ratio": build_robust_metric(
            row["methane_to_co2_ratio"],
            interpretation_reference[
                "methane_to_co2_statistics"
            ]
        ),
        "h2s_ppm": build_robust_metric(
            row["h2s_ppm"],
            interpretation_reference[
                "h2s_statistics"
            ]
        ),
        "compressor_vibration_mm_s": build_robust_metric(
            row["compressor_vibration_mm_s"],
            interpretation_reference[
                "vibration_statistics"
            ]
        ),
        "pressure_bar": build_robust_metric(
            row["pressure_bar"],
            interpretation_reference[
                "pressure_statistics"
            ]
        )
    }

    return {
        "anomaly_threshold": ANOMALY_THRESHOLD,
        "anomaly_score_interpretation": (
            "Values greater than zero are classified as anomalies"
        ),
        "model_contamination": MODEL_CONTAMINATION,
        "expected_gas_flow_m3_h": native_number(
            expected_gas_flow
        ),
        "actual_gas_flow_m3_h": native_number(
            row["gas_flow_m3_h"]
        ),
        "gas_flow_residual_m3_h": native_number(
            gas_flow_residual
        ),
        "robust_z_threshold": ROBUST_Z_THRESHOLD,
        "robust_metrics": robust_metrics
    }


# ============================================================
# SMARTCONTROL 2.0 - Main Callable Functions
# ============================================================

def run_rule_monitoring(df):
    """
    Run only the deterministic rule-based monitoring layer.
    """

    return apply_rule_based_alerts(df)


def run_anomaly_detection(
    df,
    trained_pipeline
):
    """
    Run only the Isolation Forest anomaly-detection layer.
    """

    return predict_anomalies(
        df,
        trained_pipeline
    )


def run_full_smartcontrol_pipeline(
    df,
    trained_pipeline,
    interpretation_reference
):
    """
    Run the complete SMARTCONTROL 2.0 pipeline.

    Raw input
        -> rule-based alerts
        -> feature engineering
        -> Isolation Forest
        -> dashboard interpretation
    """

    df_rules = apply_rule_based_alerts(df)

    df_anomalies = predict_anomalies(
        df_rules,
        trained_pipeline
    )

    df_dashboard = add_dashboard_interpretation(
        df_anomalies,
        interpretation_reference
    )

    return df_dashboard


def add_engineered_features_to_record(record):
    output = dict(record)

    if output["feedstock_input_tons"] <= 0:
        raise ValueError(
            "feedstock_input_tons must be greater than zero."
        )

    if output["co2_percent"] <= 0:
        raise ValueError(
            "co2_percent must be greater than zero."
        )

    output["biogas_yield_m3_per_ton"] = (
        output["gas_flow_m3_h"]
        / output["feedstock_input_tons"]
    )
    output["methane_to_co2_ratio"] = (
        output["methane_percent"]
        / output["co2_percent"]
    )

    return output


def apply_rule_alerts_to_record(record):
    output = dict(record)
    output["ph_alert"] = get_ph_alert(output["ph_value"])
    output["temperature_alert"] = get_temperature_alert(
        output["temperature_c"]
    )
    output["oxygen_alert"] = get_oxygen_alert(
        output["oxygen_percent"]
    )
    output["methane_alert"] = get_methane_alert(
        output["methane_percent"]
    )
    output["h2s_alert"] = get_h2s_alert(output["h2s_ppm"])
    output["maintenance_alert"] = get_maintenance_alert(
        output["compressor_vibration_mm_s"],
        output["pressure_bar"],
        output["maintenance_status"]
    )

    alerts = [output[column] for column in RULE_ALERT_COLUMNS]
    if "Critical" in alerts:
        output["overall_rule_status"] = "Critical"
    elif "Warning" in alerts:
        output["overall_rule_status"] = "Warning"
    else:
        output["overall_rule_status"] = "Normal"

    return output


def predict_anomaly_for_record(record, trained_pipeline):
    output = add_engineered_features_to_record(record)
    prediction = predict_with_feature_order(
        trained_pipeline,
        output,
        MODEL_FEATURES_ENGINEERED
    )[0]
    anomaly_score = -decision_function_with_feature_order(
        trained_pipeline,
        output,
        MODEL_FEATURES_ENGINEERED
    )[0]

    output["anomaly_score"] = anomaly_score
    output["anomaly_flag"] = (
        "Anomaly" if prediction == -1 else "Normal"
    )

    return output


def run_full_smartcontrol_pipeline_for_record(
    record,
    trained_pipeline,
    interpretation_reference
):
    """
    Runtime inference path for serverless API use without pandas.
    """

    rule_record = apply_rule_alerts_to_record(record)
    anomaly_record = predict_anomaly_for_record(
        rule_record,
        trained_pipeline
    )
    interpretation = interpret_dashboard_row(
        anomaly_record,
        interpretation_reference
    )

    return {
        **anomaly_record,
        **interpretation
    }


def load_smartcontrol_assets(
    model_path,
    interpretation_reference_path
):
    """
    Load saved model and interpretation assets.
    """

    trained_pipeline = joblib.load(
        model_path
    )

    interpretation_reference = joblib.load(
        interpretation_reference_path
    )

    return (
        trained_pipeline,
        interpretation_reference
    )
