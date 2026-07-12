import json
import math
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from api.index import app, get_assets, get_history_payload
from api.smartcontrol_pipeline import (
    RULE_THRESHOLDS,
    calculate_robust_z_score,
    get_maintenance_alert,
    get_methane_alert,
    get_oxygen_alert,
    get_ph_alert,
    get_temperature_alert,
)

client = TestClient(app)
ROOT_DIR = Path(__file__).resolve().parents[2]
HISTORY_PATH = ROOT_DIR / "public" / "data" / "dashboard-history.json"
MEASUREMENT_FIELDS = [
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
    "maintenance_status",
]


@pytest.fixture(scope="session")
def history_records():
    payload = json.loads(HISTORY_PATH.read_text(encoding="utf-8"))
    return payload["records"]


def measurement(records, measurement_id):
    record = next(item for item in records if item["measurement_id"] == measurement_id)
    return {key: record[key] for key in MEASUREMENT_FIELDS}


def test_asset_loading():
    model, reference = get_assets()

    assert model is not None
    assert reference is not None
    assert model["runtime_format"] == "smartcontrol_isolation_forest_v1"
    assert "gas_flow_model" in reference
    assert isinstance(reference["gas_flow_model"], dict)


def test_health_endpoint():
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "model_loaded": True,
        "interpretation_reference_loaded": True,
        "history_loaded": True,
        "model_scope": "Plant_01 simulated proof of concept",
    }


def test_metadata_endpoint():
    response = client.get("/api/metadata")

    assert response.status_code == 200
    payload = response.json()
    assert payload["anomaly_threshold"] == 0
    assert payload["robust_z_score_threshold"] == 2.5
    assert payload["isolation_forest_contamination"] == 0.01
    assert payload["historical_row_count"] == 600
    assert payload["dataset_date_range"] == {
        "start": "2026-01-01",
        "end": "2026-04-30",
    }
    assert payload["rule_thresholds"] == RULE_THRESHOLDS


def test_history_endpoint_and_latest_date_filtering():
    response = client.get("/api/history?days=7")

    assert response.status_code == 200
    payload = response.json()
    assert payload["metadata"]["raw_record_count"] == 35
    assert payload["metadata"]["distinct_date_count"] == 7
    assert payload["metadata"]["period_start"] == "2026-04-24"
    assert payload["metadata"]["period_end"] == "2026-04-30"
    assert payload["records"][-1]["measurement_id"] == "M0600"


def test_history_filters():
    anomaly_response = client.get("/api/history?anomaly_only=true")
    critical_response = client.get("/api/history?status=Critical")
    limit_response = client.get("/api/history?limit=100")

    assert anomaly_response.status_code == 200
    assert len(anomaly_response.json()["records"]) == 6
    assert critical_response.status_code == 200
    assert len(critical_response.json()["records"]) == 4
    assert limit_response.status_code == 200
    assert len(limit_response.json()["records"]) == 100


def test_successful_analysis_contains_existing_fields_and_diagnostics(history_records):
    response = client.post("/api/analyze", json=measurement(history_records, "M0123"))

    assert response.status_code == 200
    payload = response.json()
    for field in MEASUREMENT_FIELDS:
        assert field in payload
    for field in [
        "biogas_yield_m3_per_ton",
        "methane_to_co2_ratio",
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
        "diagnostics",
    ]:
        assert field in payload
    assert payload["diagnostics"]["anomaly_threshold"] == 0
    assert payload["diagnostics"]["robust_z_threshold"] == 2.5
    assert payload["diagnostics"]["robust_metrics"]["gas_flow_residual"]["deviation"] in {
        "Low deviation",
        "Normal",
        "High deviation",
    }


def test_invalid_feedstock_input(history_records):
    payload = measurement(history_records, "M0600")
    payload["feedstock_input_tons"] = 0

    response = client.post("/api/analyze", json=payload)

    assert response.status_code == 422


def test_invalid_co2_input(history_records):
    payload = measurement(history_records, "M0600")
    payload["co2_percent"] = 0

    response = client.post("/api/analyze", json=payload)

    assert response.status_code == 422


def test_json_serialization_has_no_nan(history_records):
    response = client.post("/api/analyze", json=measurement(history_records, "M0600"))

    assert response.status_code == 200
    encoded = json.dumps(response.json())
    assert "NaN" not in encoded
    assert "Infinity" not in encoded


def test_robust_z_score_formula():
    z_score = calculate_robust_z_score(12, {"median": 10, "mad": 2})

    assert z_score == pytest.approx(0.6745)


def test_rule_boundaries_and_maintenance_logic():
    assert get_ph_alert(6.5) == "Warning"
    assert get_ph_alert(6.8) == "Normal"
    assert get_ph_alert(7.8) == "Warning"
    assert get_ph_alert(7.81) == "Critical"
    assert get_temperature_alert(33) == "Warning"
    assert get_temperature_alert(35) == "Normal"
    assert get_oxygen_alert(0.2) == "Normal"
    assert get_oxygen_alert(0.21) == "Warning"
    assert get_methane_alert(48) == "Warning"
    assert get_methane_alert(52) == "Normal"
    assert get_maintenance_alert(5.1, 1.2, "none") == "Warning"
    assert get_maintenance_alert(4.0, 0.98, "none") == "Critical"
    assert get_maintenance_alert(4.0, 1.2, "overdue") == "Warning"


@pytest.mark.parametrize(
    ("measurement_id", "rule_status", "anomaly_flag", "trigger_source", "score"),
    [
        ("M0600", "Normal", "Normal", "None", -0.1414169168),
        ("M0123", "Normal", "Anomaly", "Isolation Forest", 0.1699632115),
        ("M0128", "Critical", "Normal", "Rule-Based", -0.0701817186),
    ],
)
def test_golden_records(history_records, measurement_id, rule_status, anomaly_flag, trigger_source, score):
    response = client.post("/api/analyze", json=measurement(history_records, measurement_id))

    assert response.status_code == 200
    payload = response.json()
    assert payload["overall_rule_status"] == rule_status
    assert payload["anomaly_flag"] == anomaly_flag
    assert payload["trigger_source"] == trigger_source
    assert payload["anomaly_score"] == pytest.approx(score, abs=1e-6)


def test_m0123_is_ai_only_anomaly(history_records):
    response = client.post("/api/analyze", json=measurement(history_records, "M0123"))

    assert response.status_code == 200
    payload = response.json()
    assert payload["overall_rule_status"] == "Normal"
    for alert_name in (
        "ph_alert",
        "temperature_alert",
        "oxygen_alert",
        "methane_alert",
        "h2s_alert",
        "maintenance_alert",
    ):
        assert payload[alert_name] == "Normal"
    assert payload["anomaly_flag"] == "Anomaly"
    assert payload["trigger_source"] == "Isolation Forest"
    assert payload["anomaly_score"] > payload["diagnostics"]["anomaly_threshold"]


def test_cached_history_payload():
    payload = get_history_payload()

    assert payload["metadata"]["row_count"] == 600
    assert payload["records"][-1]["measurement_id"] == "M0600"
