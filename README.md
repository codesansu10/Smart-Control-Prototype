# SMARTCONTROL 2.0

SMARTCONTROL 2.0 is a model-backed proof-of-concept dashboard for one simulated biogas plant, `Plant_01`. It combines a Vite/React frontend with a FastAPI inference service that serves the supplied SMARTCONTROL pipeline, Isolation Forest model, interpretation reference, and workbook-derived historical data.

The application is intended for three audiences:

- Operations teams who need quick current-measurement status, rule alerts, and recommended next actions.
- Business users and leadership who need understandable summaries and period KPIs.
- Data-science, process-engineering, and software teams who need diagnostics, score semantics, and validation views.

The supplied model and historical dataset represent one simulated plant, `Plant_01`.

## Main Dashboard

The root application is the production-built dashboard. It has two state-driven modes and does not use React Router.

### Normal Mode

Normal mode is for operational and executive monitoring. It shows:

- Unified status, rule status, AI anomaly status, trigger source, expert-review state, data source, and analysis timestamp.
- Six operational cards: pH, temperature, methane, biogas yield, H2S, and maintenance.
- Pipeline explanation, possible issue category, and recommended action.
- Period KPIs derived only from the selected history period.
- Daily executive trend charts using workbook dates.

### Advanced Mode

Advanced mode is for model validation and engineering review. It shows:

- All six deterministic rules and exact thresholds.
- Raw Isolation Forest anomaly score, zero threshold, distance from threshold, contamination setting, and trigger source.
- Interpretation-reference diagnostics including expected gas flow, residual, robust z-scores, medians, MAD values, and deviation classifications.
- Raw observation, anomaly-score, rule-breakdown, and robust-z visualizations.

## Model And Rules

The rule system monitors pH, temperature, oxygen, methane, H2S, and maintenance. Rule thresholds are returned by `/api/metadata` and used by the frontend where practical.

The Isolation Forest is an unsupervised early-warning model.

The anomaly score is a signed Isolation Forest decision score:

```text
anomaly_score > 0  -> Anomaly
anomaly_score <= 0 -> Normal
```

It is not a probability, not confidence, not a percentage, and not restricted to `0-1`.

Robust statistics use:

```text
0.6745 * (value - median) / mad
```

Deviation classification uses a robust z-score threshold of `2.5`.

## Historical Workbook Data

The workbook at `source-data/SMARTCONTROL_2_Final_Dashboard_Output.xlsx` is the traceable source of historical demonstration data. The serverless API does not reopen Excel during each request. Instead:

```bash
python scripts/export_dashboard_history.py
```

reads the `Dashboard_Output` sheet, validates the expected schema and counts, converts dates to ISO strings, replaces missing values with JSON `null`, and writes:

```text
public/data/dashboard-history.json
```

Committed history facts:

- 600 measurements
- 120 distinct dates
- 5 measurements per date
- `Plant_01` only
- Date range: `2026-01-01` through `2026-04-30`
- 6 AI anomalies
- 30 rule-based triggers
- 4 critical rule rows
- Current measurement record: `M0600`

The workbook contains historical demonstration data, not a live telemetry stream.

## Period Logic

The dataset does not contain current July 2026 data and has no time-of-day column. Periods such as "7 available days" use the last seven available dataset dates, not the browser or server current date. Executive charts aggregate by date. Advanced charts can show raw observations ordered by date and measurement ID.

## Scenario Selector

The dashboard includes verified scenarios:

- Current measurement record: `M0600`, Normal.
- AI anomaly example: `M0123`, rule status Normal and Isolation Forest anomaly.
- Critical rule record: `M0128`, Critical rule status and normal AI flag.
- Custom measurement: accessible 19-field analysis drawer.

Scenario selections submit the raw input values to `/api/analyze` when the live API is available. Static history is used only as a visible fallback.

## Report Export

The dashboard can generate a self-contained HTML report and print/save it as PDF. Reports include the selected scenario, reporting period, current measurement context, all 19 inputs, engineered features, rule outputs, anomaly score and threshold, diagnostics, period KPIs, recent history, workflow decision, and model limitations. Raw API JSON appendices are intentionally omitted from the report output.

## API Endpoints

The FastAPI app is exposed under `/api/*`:

```text
GET  /api/
GET  /api/health
GET  /api/metadata
GET  /api/history
POST /api/analyze
```

History supports:

```text
/api/history?days=7
/api/history?days=30
/api/history?limit=100
/api/history?anomaly_only=true
/api/history?status=Critical
```

The frontend calls relative paths by default:

```ts
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";
```

For local Vite development, `vite.config.ts` proxies `/api` to `http://127.0.0.1:8000`.

## Local Setup

Install Python dependencies:

```bash
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements-dev.txt
```

Install frontend dependencies:

```bash
npm install
```

Export history JSON after workbook changes:

```bash
.venv\Scripts\python scripts/export_dashboard_history.py
```

Run the backend locally:

```bash
.venv\Scripts\python -m uvicorn api.index:app --reload --port 8000
```

Run the frontend locally:

```bash
npm run dev
```

## Vercel Setup

The repository is configured for a single Vercel project with:

- Vite frontend build command: `npm run build`
- Output directory: `dist`
- Python FastAPI entrypoint: `api/index.py`
- Python version: `3.12`
- Model and history files included in the Python function bundle
- Legacy prototype, source workbook, tests, caches, and archive files excluded from the Python bundle

The Vercel Git integration should deploy pushes to the connected repository. There is no GitHub Pages workflow.

Optional environment variables:

```text
SMARTCONTROL_ALLOWED_ORIGINS
VITE_API_BASE_URL
```

`SMARTCONTROL_ALLOWED_ORIGINS` is only needed if the frontend and API are served from different origins.

## Testing

Run backend and data tests:

```bash
pytest
```

Run frontend tests:

```bash
npm test
```

Run production build:

```bash
npm run build
```

When Vercel CLI is available:

```bash
vercel build
vercel dev
```

Verify:

```text
/api/health
/api/metadata
/api/history?days=7
/api/analyze
```

## Legacy Workflow Prototype

The previous static multi-plant workflow prototype is preserved as a reference:

```text
public/legacy/
```

Open it through:

```text
/legacy/
```

Legacy workflow prototype behavior is kept separate from the model-backed root dashboard.

## Current Limitations

- The supplied model and historical dataset represent one simulated plant, `Plant_01`.
- A detected anomaly is not a confirmed diagnosis.
- The workbook data is historical demonstration data, not a live telemetry stream.
- The backend analyzes one submitted measurement at a time.
- Real telemetry ingestion, authentication, audit storage, operator workflows, and multi-plant model serving are future production requirements.
- Real deployment requires calibration and validation using actual target-plant data.
