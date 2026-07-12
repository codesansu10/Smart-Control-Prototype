from __future__ import annotations

import json
import math
import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, field_validator

from .smartcontrol_pipeline import (
    ANOMALY_THRESHOLD,
    ENGINEERED_FEATURES,
    MODEL_CONTAMINATION,
    MODEL_FEATURES,
    MODEL_FEATURES_ENGINEERED,
    ROBUST_Z_THRESHOLD,
    RULE_ALERT_COLUMNS,
    RULE_THRESHOLDS,
    SUPPORTED_MAINTENANCE_STATUSES,
    build_interpretation_diagnostics,
    load_smartcontrol_assets,
    run_full_smartcontrol_pipeline_for_record,
)

API_DIR = Path(__file__).resolve().parent
MODEL_DIR = API_DIR / "models"
ROOT_DIR = API_DIR.parent
API_HISTORY_PATH = API_DIR / "data" / "dashboard-history.json"
PUBLIC_HISTORY_PATH = ROOT_DIR / "public" / "data" / "dashboard-history.json"
HISTORY_PATHS = (API_HISTORY_PATH, PUBLIC_HISTORY_PATH)

MODEL_SCOPE = "Plant_01 simulated proof of concept"
MODEL_LIMITATIONS = [
    "The supplied model and historical dataset represent one simulated plant, Plant_01.",
    "The Isolation Forest is an unsupervised early-warning model.",
    "A detected anomaly is not a confirmed diagnosis.",
    "The workbook contains historical demonstration data, not a live telemetry stream.",
    "Real deployment requires calibration and validation using actual target-plant data.",
]


class PlantMeasurement(BaseModel):
    model_config = ConfigDict(extra="forbid")

    feedstock_input_tons: float
    carbohydrate_percent: float
    protein_percent: float
    fat_percent: float
    ph_value: float
    temperature_c: float
    oxygen_percent: float
    retention_time_days: float
    organic_loading_rate_kg_vs_m3_day: float
    gas_flow_m3_h: float
    methane_percent: float
    co2_percent: float
    h2s_ppm: float
    pressure_bar: float
    mixing_speed_rpm: float
    pump_runtime_hours: float
    compressor_vibration_mm_s: float
    outside_temperature_c: float
    maintenance_status: str = Field(min_length=1)

    @field_validator(
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
        "outside_temperature_c",
    )
    @classmethod
    def numeric_values_must_be_finite(cls, value: float) -> float:
        if not math.isfinite(value):
            raise ValueError("numeric inputs must be finite")
        return value

    @field_validator("feedstock_input_tons")
    @classmethod
    def feedstock_must_be_positive(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("feedstock_input_tons must be greater than zero")
        return value

    @field_validator("co2_percent")
    @classmethod
    def co2_must_be_positive(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("co2_percent must be greater than zero")
        return value

    @field_validator("maintenance_status")
    @classmethod
    def maintenance_status_must_be_supported(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in SUPPORTED_MAINTENANCE_STATUSES:
            supported = ", ".join(SUPPORTED_MAINTENANCE_STATUSES)
            raise ValueError(
                f"maintenance_status must be one of: {supported}"
            )
        return normalized


app = FastAPI(
    title="SMARTCONTROL 2.0 API",
    version="2.0.0",
    description="Model-backed SMARTCONTROL 2.0 inference and history API.",
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv("SMARTCONTROL_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]

if allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
    )


def to_jsonable(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: to_jsonable(item) for key, item in value.items()}
    if isinstance(value, list):
        return [to_jsonable(item) for item in value]
    if isinstance(value, tuple):
        return [to_jsonable(item) for item in value]
    if hasattr(value, "item"):
        value = value.item()
    if isinstance(value, float) and math.isnan(value):
        return None
    return value


@lru_cache(maxsize=1)
def get_assets() -> tuple[Any, Any]:
    model_path = MODEL_DIR / "smartcontrol_runtime_model.joblib"
    reference_path = (
        MODEL_DIR / "smartcontrol_runtime_reference.joblib"
    )

    if not model_path.exists():
        raise RuntimeError(f"Missing model file: {model_path}")
    if not reference_path.exists():
        raise RuntimeError(
            f"Missing interpretation reference file: {reference_path}"
        )

    return load_smartcontrol_assets(
        model_path,
        reference_path,
    )


@lru_cache(maxsize=1)
def get_history_payload() -> dict[str, Any]:
    history_path = next((path for path in HISTORY_PATHS if path.exists()), None)
    if history_path is None:
        expected_paths = ", ".join(str(path) for path in HISTORY_PATHS)
        raise RuntimeError(f"Missing history JSON in: {expected_paths}")

    with history_path.open("r", encoding="utf-8") as file:
        payload = json.load(file)

    records = payload.get("records")
    metadata = payload.get("metadata")

    if not isinstance(records, list) or not isinstance(metadata, dict):
        raise RuntimeError("History JSON must contain metadata and records")

    return payload


def get_history_records() -> list[dict[str, Any]]:
    return list(get_history_payload()["records"])


def history_metadata(records: list[dict[str, Any]]) -> dict[str, Any]:
    dates = sorted({record["date"] for record in records})
    return {
        "period_start": dates[0] if dates else None,
        "period_end": dates[-1] if dates else None,
        "raw_record_count": len(records),
        "distinct_date_count": len(dates),
        "aggregation_assumptions": (
            "Periods are evaluated against available dataset dates. "
            "The workbook has five raw observations per date and no "
            "time-of-day column; executive trends aggregate by date."
        ),
    }


def filter_history(
    *,
    days: int | None,
    limit: int | None,
    status: str | None,
    anomaly_only: bool,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    records = sorted(
        get_history_records(),
        key=lambda item: (item["date"], item["measurement_id"]),
    )

    if days is not None:
        dates = sorted({record["date"] for record in records})
        selected_dates = set(dates[-days:])
        records = [
            record for record in records
            if record["date"] in selected_dates
        ]

    if status:
        normalized = status.strip().title()
        records = [
            record for record in records
            if record.get("overall_rule_status") == normalized
        ]

    if anomaly_only:
        records = [
            record for record in records
            if record.get("anomaly_flag") == "Anomaly"
        ]

    if limit is not None:
        records = records[-limit:]

    return records, history_metadata(records)


def asset_health() -> dict[str, bool]:
    model, reference = get_assets()
    payload = get_history_payload()
    return {
        "model_loaded": model is not None,
        "interpretation_reference_loaded": reference is not None,
        "history_loaded": bool(payload.get("records")),
    }


@app.get("/api/")
def root() -> dict[str, Any]:
    return {
        "message": "SMARTCONTROL 2.0 API is running",
        "api_version": app.version,
        "model_scope": MODEL_SCOPE,
    }


@app.get("/api/health")
def health() -> dict[str, Any]:
    try:
        loaded = asset_health()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Required SMARTCONTROL asset could not be loaded: {exc}",
        ) from exc

    if not all(loaded.values()):
        raise HTTPException(
            status_code=503,
            detail="One or more required SMARTCONTROL assets are unavailable",
        )

    return {
        "status": "ok",
        **loaded,
        "model_scope": MODEL_SCOPE,
    }


@app.get("/api/metadata")
def metadata() -> dict[str, Any]:
    try:
        model, _reference = get_assets()
        payload = get_history_payload()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Required SMARTCONTROL asset could not be loaded: {exc}",
        ) from exc

    model_contamination = MODEL_CONTAMINATION
    try:
        model_contamination = float(
            model.named_steps["model"].contamination
        )
    except Exception:
        model_contamination = MODEL_CONTAMINATION

    history = payload["metadata"]

    return {
        "model_feature_names": MODEL_FEATURES,
        "engineered_feature_names": ENGINEERED_FEATURES,
        "model_feature_names_engineered": MODEL_FEATURES_ENGINEERED,
        "rule_alert_names": RULE_ALERT_COLUMNS,
        "rule_thresholds": RULE_THRESHOLDS,
        "anomaly_threshold": ANOMALY_THRESHOLD,
        "robust_z_score_threshold": ROBUST_Z_THRESHOLD,
        "isolation_forest_contamination": model_contamination,
        "supported_maintenance_status_values": (
            SUPPORTED_MAINTENANCE_STATUSES
        ),
        "model_scope": MODEL_SCOPE,
        "model_limitations": MODEL_LIMITATIONS,
        "dataset_date_range": {
            "start": history["date_range"]["start"],
            "end": history["date_range"]["end"],
        },
        "historical_row_count": history["row_count"],
    }


@app.get("/api/history")
def history_endpoint(
    days: int | None = Query(default=None, ge=1),
    limit: int | None = Query(default=None, ge=1),
    status: Literal["Normal", "Warning", "Critical"] | None = None,
    anomaly_only: bool = False,
) -> dict[str, Any]:
    try:
        records, metadata_block = filter_history(
            days=days,
            limit=limit,
            status=status,
            anomaly_only=anomaly_only,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"History could not be loaded: {exc}",
        ) from exc

    return {
        "records": records,
        "metadata": metadata_block,
    }


@app.post("/api/analyze")
def analyze_measurement(measurement: PlantMeasurement) -> dict[str, Any]:
    try:
        model, interpretation_reference = get_assets()
        response = run_full_smartcontrol_pipeline_for_record(
            record=measurement.model_dump(),
            trained_pipeline=model,
            interpretation_reference=interpretation_reference,
        )

        response["diagnostics"] = build_interpretation_diagnostics(
            response,
            interpretation_reference,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"SMARTCONTROL analysis failed: {exc}",
        ) from exc

    return jsonable_encoder(to_jsonable(response))
