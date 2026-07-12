from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parents[1]
SOURCE_PATH = (
    ROOT_DIR
    / "source-data"
    / "SMARTCONTROL_2_Final_Dashboard_Output.xlsx"
)
OUTPUT_PATH = ROOT_DIR / "public" / "data" / "dashboard-history.json"
SHEET_NAME = "Dashboard_Output"

EXPECTED_COLUMNS = [
    "measurement_id",
    "date",
    "plant_id",
    "day_number",
    "feedstock_type",
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
    "biogas_yield_m3_per_ton",
    "methane_percent",
    "co2_percent",
    "methane_to_co2_ratio",
    "h2s_ppm",
    "pressure_bar",
    "mixing_speed_rpm",
    "pump_runtime_hours",
    "compressor_vibration_mm_s",
    "outside_temperature_c",
    "season",
    "maintenance_status",
    "ph_alert",
    "temperature_alert",
    "oxygen_alert",
    "methane_alert",
    "h2s_alert",
    "maintenance_alert",
    "overall_rule_status",
    "anomaly_score",
    "anomaly_flag",
    "expert_review_required",
    "trigger_source",
    "possible_issue_category",
    "short_explanation",
    "recommended_action",
]


def json_value(value: Any) -> Any:
    if isinstance(value, pd.Timestamp):
        return value.date().isoformat()

    if isinstance(value, np.generic):
        value = value.item()

    if isinstance(value, float) and math.isnan(value):
        return None

    if pd.isna(value):
        return None

    return value


def value_counts(df: pd.DataFrame, column: str) -> dict[str, int]:
    return {
        str(key): int(value)
        for key, value in df[column].value_counts(dropna=False).items()
    }


def validate_dashboard_history(df: pd.DataFrame) -> None:
    missing_columns = [
        column for column in EXPECTED_COLUMNS
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(f"Missing columns: {missing_columns}")

    unexpected_columns = [
        column for column in df.columns
        if column not in EXPECTED_COLUMNS
    ]

    if unexpected_columns:
        raise ValueError(f"Unexpected columns: {unexpected_columns}")

    if len(df) != 600:
        raise ValueError(f"Expected 600 records, found {len(df)}")

    if df["date"].nunique() != 120:
        raise ValueError(
            f"Expected 120 distinct dates, found {df['date'].nunique()}"
        )

    measurements_per_date = df.groupby("date").size()
    if not (measurements_per_date == 5).all():
        raise ValueError("Expected exactly five measurements per date")

    expected_counts = {
        "overall_rule_status": {
            "Normal": 570,
            "Warning": 26,
            "Critical": 4,
        },
        "anomaly_flag": {
            "Normal": 594,
            "Anomaly": 6,
        },
        "trigger_source": {
            "None": 564,
            "Rule-Based": 30,
            "Isolation Forest": 6,
        },
        "expert_review_required": {
            "No": 564,
            "Yes": 36,
        },
    }

    trigger_source = df["trigger_source"].fillna("None")

    actual_counts = {
        "overall_rule_status": (
            df["overall_rule_status"].value_counts().to_dict()
        ),
        "anomaly_flag": df["anomaly_flag"].value_counts().to_dict(),
        "trigger_source": trigger_source.value_counts().to_dict(),
        "expert_review_required": (
            df["expert_review_required"].value_counts().to_dict()
        ),
    }

    for column, counts in expected_counts.items():
        if actual_counts[column] != counts:
            raise ValueError(
                f"Unexpected {column} counts: {actual_counts[column]}"
            )

    if df["plant_id"].nunique() != 1 or df["plant_id"].iloc[0] != "Plant_01":
        raise ValueError("Expected Plant_01 as the only plant")

    if df["measurement_id"].iloc[-1] != "M0600":
        raise ValueError("Expected latest measurement M0600")


def export_dashboard_history() -> dict[str, Any]:
    df = pd.read_excel(SOURCE_PATH, sheet_name=SHEET_NAME)
    validate_dashboard_history(df)

    df = df[EXPECTED_COLUMNS].copy()
    df["date"] = pd.to_datetime(df["date"]).dt.date.astype(str)

    records = [
        {column: json_value(value) for column, value in row.items()}
        for row in df.to_dict(orient="records")
    ]

    dates = sorted(df["date"].unique().tolist())
    metadata = {
        "source_workbook": SOURCE_PATH.relative_to(ROOT_DIR).as_posix(),
        "sheet_name": SHEET_NAME,
        "row_count": int(len(df)),
        "distinct_date_count": int(df["date"].nunique()),
        "measurements_per_date": 5,
        "plant_ids": sorted(df["plant_id"].unique().tolist()),
        "date_range": {
            "start": dates[0],
            "end": dates[-1],
        },
        "counts": {
            "overall_rule_status": value_counts(
                df,
                "overall_rule_status",
            ),
            "anomaly_flag": value_counts(df, "anomaly_flag"),
            "trigger_source": value_counts(
                df.assign(
                    trigger_source=df["trigger_source"].fillna("None")
                ),
                "trigger_source",
            ),
            "expert_review_required": value_counts(
                df,
                "expert_review_required",
            ),
        },
        "aggregation_assumptions": (
            "Last-N-day periods use the last N available dataset dates, "
            "not browser or server current dates. The workbook has five "
            "measurements per date and no time-of-day column."
        ),
    }

    payload = {
        "metadata": metadata,
        "records": records,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as file:
        json.dump(payload, file, indent=2)
        file.write("\n")

    return payload


if __name__ == "__main__":
    payload = export_dashboard_history()
    print(
        f"Exported {payload['metadata']['row_count']} records to "
        f"{OUTPUT_PATH.relative_to(ROOT_DIR)}"
    )
