import json
from collections import Counter
from pathlib import Path

from scripts.export_dashboard_history import export_dashboard_history

ROOT_DIR = Path(__file__).resolve().parents[2]
HISTORY_PATH = ROOT_DIR / "public" / "data" / "dashboard-history.json"


def test_committed_dashboard_history_integrity():
    payload = json.loads(HISTORY_PATH.read_text(encoding="utf-8"))
    records = payload["records"]
    dates = [record["date"] for record in records]

    assert len(records) == 600
    assert len(set(dates)) == 120
    assert set(Counter(dates).values()) == {5}
    assert payload["metadata"]["counts"]["anomaly_flag"]["Anomaly"] == 6
    assert payload["metadata"]["counts"]["trigger_source"]["Rule-Based"] == 30
    assert payload["metadata"]["counts"]["overall_rule_status"]["Critical"] == 4
    assert records[-1]["measurement_id"] == "M0600"


def test_export_script_reproduces_expected_counts():
    payload = export_dashboard_history()
    records = payload["records"]

    assert payload["metadata"]["row_count"] == 600
    assert payload["metadata"]["distinct_date_count"] == 120
    assert payload["metadata"]["measurements_per_date"] == 5
    assert payload["metadata"]["counts"]["anomaly_flag"]["Anomaly"] == 6
    assert payload["metadata"]["counts"]["trigger_source"]["Rule-Based"] == 30
    assert payload["metadata"]["counts"]["overall_rule_status"]["Critical"] == 4
    assert records[-1]["measurement_id"] == "M0600"
