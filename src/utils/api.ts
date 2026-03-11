const API_BASE = import.meta.env.VITE_API_URL;

console.log(API_BASE);

export interface ToneResponse {
  frequency: number;
  db_level: number;
  ear: string;
  ear_label: string;
  freq_index: number;
  total_frequencies: number;
  action_name: string;
  freq_done: boolean;
  ear_done: boolean;
  test_done: boolean;
  found_thresholds_right: Record<string, number>;
  found_thresholds_left: Record<string, number>;
  steps_taken: number;
  steps_on_freq: number;
  message: string;
  min_heard?: number | null;
  max_not_heard?: number | null;
  gap?: number | null;
}

export interface VirtualTestResult {
  found_thresholds_right: Record<string, number>;
  true_thresholds_right: Record<string, number>;
  errors_right: Record<string, number>;
  found_thresholds_left: Record<string, number>;
  true_thresholds_left: Record<string, number>;
  errors_left: Record<string, number>;
  avg_error: number;
  max_error: number;
  total_steps: number;
  diagnosis_right: string;
  diagnosis_left: string;
  classification_right: string;
  classification_left: string;
  steps_log: Array<{
    step: number;
    ear: string;
    ear_label: string;
    frequency: number;
    db_level: number;
    action: string;
    heard: boolean;
    reward: number;
  }>;
}

export interface ModelInfo {
  loaded: boolean;
  architecture: {
    type: string;
    policy: string;
    actor: string;
    critic: string;
    observation_dim: number;
    action_dim: number;
    features: string[];
    actions: string[];
  };
  frequencies: number[];
  db_range: number[];
  max_steps_per_freq: number;
  ears: string[];
}

export async function checkHealth(): Promise<{ status: string; model_loaded: boolean }> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error("Server unavailable");
  return res.json();
}

export async function getModelInfo(): Promise<ModelInfo> {
  const res = await fetch(`${API_BASE}/api/model_info`);
  if (!res.ok) throw new Error("Failed to get model info");
  return res.json();
}

export async function runVirtualTest(): Promise<VirtualTestResult> {
  const res = await fetch(`${API_BASE}/api/virtual_test`, { method: "POST" });
  if (!res.ok) throw new Error("Virtual test failed");
  return res.json();
}

export async function startRealTest(sessionId: string): Promise<ToneResponse> {
  const res = await fetch(`${API_BASE}/api/start_test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error("Failed to start test");
  return res.json();
}

export async function sendStep(sessionId: string, heard: boolean): Promise<ToneResponse> {
  const res = await fetch(`${API_BASE}/api/step`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, heard }),
  });
  if (!res.ok) throw new Error("Step failed");
  return res.json();
}

export async function getResults(sessionId: string) {
  const res = await fetch(`${API_BASE}/api/results/${sessionId}`);
  if (!res.ok) throw new Error("Failed to get results");
  return res.json();
}
