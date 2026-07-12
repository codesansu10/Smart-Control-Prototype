import type {
  AnalysisResult,
  ApiHealth,
  ApiMetadata,
  HistoryResponse,
  PlantMeasurement,
  StaticHistoryPayload
} from "../types/smartcontrol";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), init);

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const payload = await response.json();
      detail = payload.detail ?? detail;
    } catch {
      // The original status text is enough when the body is not JSON.
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export function getHealth(): Promise<ApiHealth> {
  return fetchJson<ApiHealth>("/api/health");
}

export function getMetadata(): Promise<ApiMetadata> {
  return fetchJson<ApiMetadata>("/api/metadata");
}

export function getHistory(days: number | "all"): Promise<HistoryResponse> {
  const query = days === "all" ? "" : `?days=${days}`;
  return fetchJson<HistoryResponse>(`/api/history${query}`);
}

export function analyzeMeasurement(measurement: PlantMeasurement): Promise<AnalysisResult> {
  return fetchJson<AnalysisResult>("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(measurement)
  });
}

export async function getStaticHistory(): Promise<StaticHistoryPayload> {
  const response = await fetch("/data/dashboard-history.json");
  if (!response.ok) {
    throw new Error("Static dashboard history could not be loaded");
  }

  return response.json() as Promise<StaticHistoryPayload>;
}
