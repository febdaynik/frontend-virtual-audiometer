import { useState, useCallback, useRef, useEffect } from "react";
import {
  checkHealth,
  getModelInfo,
  runVirtualTest,
  startRealTest,
  sendStep,
  ToneResponse,
  VirtualTestResult,
  ModelInfo,
} from "./utils/api";

const FREQUENCIES = [125, 250, 500, 1000, 2000, 4000, 8000];

// ═══════════ AudioContext ═══════════
let audioCtx: AudioContext | null = null;

function playTone(frequency: number, dbLevel: number, ear: string, durationMs: number = 1000) {
  if (!audioCtx) audioCtx = new AudioContext();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const panner = audioCtx.createStereoPanner();

  osc.type = "sine";
  osc.frequency.value = frequency;

  // Панорамирование: правое ухо → +1, левое → -1
  panner.pan.value = ear === "right" ? 1 : -1;

  const amplitude = Math.pow(10, (dbLevel - 90) / 20) * 0.5;
  const clampedAmp = Math.min(Math.max(amplitude, 0.0001), 1.0);

  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(clampedAmp, now + 0.05);
  gain.gain.setValueAtTime(clampedAmp, now + durationMs / 1000 - 0.05);
  gain.gain.linearRampToValueAtTime(0, now + durationMs / 1000);

  osc.connect(gain);
  gain.connect(panner);
  panner.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + durationMs / 1000);
}

// ═══════════ Аудиограмма (SVG) ═══════════
interface AudiogramProps {
  thresholds: Record<string, number>;
  trueThresholds?: Record<string, number>;
  title: string;
  color?: string;
}

function Audiogram({ thresholds, trueThresholds, title, color = "#3B82F6" }: AudiogramProps) {
  const width = 500;
  const height = 350;
  const pad = { top: 40, right: 30, bottom: 40, left: 55 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const freqLabels = FREQUENCIES.map((f) => (f >= 1000 ? `${f / 1000}k` : `${f}`));
  const xScale = (i: number) => pad.left + (i / (FREQUENCIES.length - 1)) * plotW;
  const yScale = (db: number) => pad.top + (db / 120) * plotH;

  const makeLine = (data: Record<string, number>, c: string, dashed = false) => {
    const pts: string[] = [];
    FREQUENCIES.forEach((f, i) => {
      const v = data[String(f)];
      if (v !== undefined) pts.push(`${xScale(i)},${yScale(v)}`);
    });
    if (pts.length < 2) return null;
    return <polyline points={pts.join(" ")} fill="none" stroke={c} strokeWidth={2} strokeDasharray={dashed ? "6,4" : "none"} />;
  };

  return (
      <div className="bg-gray-900 rounded-xl p-4">
        <h3 className="text-center text-sm font-semibold text-gray-300 mb-2">{title}</h3>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
          {[0, 20, 40, 60, 80, 100, 120].map((db) => (
              <g key={db}>
                <line x1={pad.left} y1={yScale(db)} x2={width - pad.right} y2={yScale(db)} stroke="#374151" />
                <text x={pad.left - 8} y={yScale(db) + 4} textAnchor="end" fill="#9CA3AF" fontSize={11}>{db}</text>
              </g>
          ))}
          {FREQUENCIES.map((_, i) => (
              <g key={i}>
                <line x1={xScale(i)} y1={pad.top} x2={xScale(i)} y2={height - pad.bottom} stroke="#374151" />
                <text x={xScale(i)} y={height - pad.bottom + 18} textAnchor="middle" fill="#9CA3AF" fontSize={11}>{freqLabels[i]}</text>
              </g>
          ))}
          <text x={width / 2} y={height - 5} textAnchor="middle" fill="#9CA3AF" fontSize={12}>Частота (Гц)</text>
          <text x={14} y={height / 2} textAnchor="middle" fill="#9CA3AF" fontSize={12} transform={`rotate(-90, 14, ${height / 2})`}>дБ HL</text>
          {trueThresholds && makeLine(trueThresholds, "#6B7280", true)}
          {trueThresholds && FREQUENCIES.map((f, i) => {
            const v = trueThresholds[String(f)];
            if (v === undefined) return null;
            return <circle key={`t-${f}`} cx={xScale(i)} cy={yScale(v)} r={4} fill="none" stroke="#6B7280" strokeWidth={1.5} />;
          })}
          {makeLine(thresholds, color)}
          {FREQUENCIES.map((f, i) => {
            const v = thresholds[String(f)];
            if (v === undefined) return null;
            return <circle key={`f-${f}`} cx={xScale(i)} cy={yScale(v)} r={5} fill={color} stroke={color} strokeWidth={1.5} />;
          })}
        </svg>
      </div>
  );
}

// ═══════════ EarResults — результаты одного уха ═══════════
function EarResults({
                      earLabel,
                      found,
                      trueThresholds,
                      errors,
                      diagnosis,
                      classification,
                      color,
                    }: {
  earLabel: string;
  found: Record<string, number>;
  trueThresholds?: Record<string, number>;
  errors?: Record<string, number>;
  diagnosis?: string;
  classification: string;
  color: string;
}) {
  return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold" style={{ color }}>{earLabel}</h3>
        {diagnosis && (
            <p className="text-sm text-gray-400">Диагноз: <span className="text-gray-200">{diagnosis}</span></p>
        )}
        <p className="text-sm text-gray-400">Классификация: <span style={{ color }} className="font-medium">{classification}</span></p>

        <Audiogram
            thresholds={found}
            trueThresholds={trueThresholds}
            title={earLabel}
            color={color}
        />

        {errors && (
            <table className="w-full text-sm">
              <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="text-left py-1 px-2">Частота</th>
                <th className="text-center py-1 px-2">Истинный</th>
                <th className="text-center py-1 px-2">Найденный</th>
                <th className="text-center py-1 px-2">Ошибка</th>
              </tr>
              </thead>
              <tbody>
              {FREQUENCIES.map((f) => {
                const tr = trueThresholds?.[String(f)];
                const fo = found[String(f)];
                const er = errors[String(f)];
                return (
                    <tr key={f} className="border-b border-gray-800">
                      <td className="py-1 px-2 font-medium">{f} Гц</td>
                      <td className="py-1 px-2 text-center text-gray-400">{tr ?? "—"}</td>
                      <td className="py-1 px-2 text-center" style={{ color }}>{fo ?? "—"}</td>
                      <td className="py-1 px-2 text-center">
                        {er !== undefined ? (
                            <span>{er} {er === 0 ? "✅" : er <= 5 ? "⚠️" : "❌"}</span>
                        ) : "—"}
                      </td>
                    </tr>
                );
              })}
              </tbody>
            </table>
        )}
      </div>
  );
}


// ═══════════ Main App ═══════════
type Tab = "virtual" | "real" | "info";

export default function App() {
  const [tab, setTab] = useState<Tab>("virtual");
  const [connected, setConnected] = useState<boolean | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [virtualResult, setVirtualResult] = useState<VirtualTestResult | null>(null);
  const [virtualLoading, setVirtualLoading] = useState(false);
  const [realActive, setRealActive] = useState(false);
  const [currentTone, setCurrentTone] = useState<ToneResponse | null>(null);
  const [realDone, setRealDone] = useState(false);
  const [playing, setPlaying] = useState(false);
  const sessionIdRef = useRef(`session_${Date.now()}`);

  useEffect(() => {
    checkHealth()
        .then((data) => { setConnected(true); setModelLoaded(data.model_loaded); })
        .catch(() => setConnected(false));
    getModelInfo().then(setModelInfo).catch(() => {});
  }, []);

  const handleVirtualTest = useCallback(async () => {
    setVirtualLoading(true);
    setVirtualResult(null);
    try {
      const result = await runVirtualTest();
      setVirtualResult(result);
    } catch (e) { alert("Ошибка: " + (e as Error).message); }
    setVirtualLoading(false);
  }, []);

  const handleStartReal = useCallback(async () => {
    sessionIdRef.current = `session_${Date.now()}`;
    setRealDone(false);
    try {
      const tone = await startRealTest(sessionIdRef.current);
      setCurrentTone(tone);
      setRealActive(true);
    } catch (e) { alert("Ошибка: " + (e as Error).message); }
  }, []);

  const handlePlayTone = useCallback(() => {
    if (!currentTone) return;
    setPlaying(true);
    playTone(currentTone.frequency, currentTone.db_level, currentTone.ear, 1000);
    setTimeout(() => setPlaying(false), 1100);
  }, [currentTone]);

  const handleRespond = useCallback(async (heard: boolean) => {
    if (!currentTone) return;
    try {
      const response = await sendStep(sessionIdRef.current, heard);
      setCurrentTone(response);
      if (response.test_done) {
        setRealDone(true);
        setRealActive(false);
      }
    } catch (e) { alert("Ошибка: " + (e as Error).message); }
  }, [currentTone]);

  const actionColor = (action: string) => {
    if (action.includes("СТОП")) return "text-green-400";
    if (action.includes("20")) return "text-red-400";
    if (action.includes("10")) return "text-orange-400";
    if (action.includes("5")) return "text-yellow-400";
    if (action.includes("1")) return "text-purple-400";
    return "text-gray-400";
  };

  const earIcon = (ear: string) => ear === "right" ? "👂 R" : "👂 L";
  const earColor = (ear: string) => ear === "right" ? "#F87171" : "#60A5FA";

  // Прогресс для реального теста: 0-7 правое ухо, 7-14 левое ухо
  const totalProgress = currentTone
      ? (currentTone.ear === "right" ? 0 : FREQUENCIES.length) + currentTone.freq_index
      : 0;
  const totalFreqs = FREQUENCIES.length * 2;

  return (
      <div className="min-h-screen bg-gray-950 text-white">
        <header className="bg-gray-900 border-b border-gray-800 py-4">
          <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-blue-400">🎧 Виртуальный аудиометр</h1>
              <p className="text-sm text-gray-400 mt-1">RL-агент (PPO) · 9 действий</p>
            </div>
            <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                connected === null ? "bg-gray-700 text-gray-300" :
                    connected ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                  connected === null ? "bg-gray-400" : connected ? "bg-green-400" : "bg-red-400"
              }`}></span>
              {connected === null ? "Проверка..." : connected ? "Подключён" : "Нет связи"}
            </span>
              {connected && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      modelLoaded ? "bg-blue-900 text-blue-300" : "bg-yellow-900 text-yellow-300"
                  }`}>{modelLoaded ? "Модель подключена" : "Нет модели"}</span>
              )}
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 mt-6">
          <div className="flex gap-2 mb-6">
            {([
              ["virtual", "🤖 Виртуальный пациент"],
              ["real", "🎧 Реальный тест"],
              ["info", "🧠 Архитектура ИНС"],
            ] as [Tab, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)}
                        className={`px-5 py-2.5 rounded-lg font-medium text-sm transition ${
                            tab === key ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        }`}>{label}</button>
            ))}
          </div>

          {/* ═══ Virtual Test ═══ */}
          {tab === "virtual" && (
              <div className="space-y-6">
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                  <h2 className="text-lg font-semibold mb-3">Тест виртуального пациента</h2>
                  <p className="text-gray-400 text-sm mb-4">
                    ИНС автоматически проведёт аудиометрию виртуального пациента.
                    Тестируются <strong>оба уха</strong> — сначала правое, потом левое.
                    Каждое ухо имеет свой уникальный профиль потери слуха.
                  </p>
                  <button onClick={handleVirtualTest} disabled={virtualLoading || !connected || !modelLoaded}
                          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium transition">
                    {virtualLoading ? "⏳ Тестирование..." : "▶ Запустить тест"}
                  </button>
                </div>

                {virtualResult && (<>
                  {/* Общая статистика */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard label="Ср. ошибка" value={`${virtualResult.avg_error} дБ`}
                              color={virtualResult.avg_error <= 1 ? "green" : virtualResult.avg_error <= 5 ? "yellow" : "red"} />
                    <StatCard label="Макс. ошибка" value={`${virtualResult.max_error} дБ`}
                              color={virtualResult.max_error <= 2 ? "green" : virtualResult.max_error <= 5 ? "yellow" : "red"} />
                    <StatCard label="Всего шагов" value={String(virtualResult.total_steps)} />
                    <StatCard label="Шагов/частота" value={`~${(virtualResult.total_steps / 14).toFixed(1)}`}
                              color={virtualResult.total_steps / 14 <= 10 ? "green" : virtualResult.total_steps / 14 <= 15 ? "yellow" : "red"} />
                  </div>

                  {/* Результаты по ушам */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-900 rounded-xl p-5 border border-red-900/50">
                      <EarResults
                          earLabel="👂 Правое ухо (R)"
                          found={virtualResult.found_thresholds_right}
                          trueThresholds={virtualResult.true_thresholds_right}
                          errors={virtualResult.errors_right}
                          diagnosis={virtualResult.diagnosis_right}
                          classification={virtualResult.classification_right}
                          color="#F87171"
                      />
                    </div>
                    <div className="bg-gray-900 rounded-xl p-5 border border-blue-900/50">
                      <EarResults
                          earLabel="👂 Левое ухо (L)"
                          found={virtualResult.found_thresholds_left}
                          trueThresholds={virtualResult.true_thresholds_left}
                          errors={virtualResult.errors_left}
                          diagnosis={virtualResult.diagnosis_left}
                          classification={virtualResult.classification_left}
                          color="#60A5FA"
                      />
                    </div>
                  </div>

                  {/* Лог действий */}
                  <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                    <h3 className="font-semibold mb-3">Лог действий агента ({virtualResult.steps_log.length} шагов)</h3>
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full text-xs font-mono">
                        <thead>
                        <tr className="text-gray-500 border-b border-gray-700">
                          <th className="text-left py-1 px-2">#</th>
                          <th className="text-left py-1 px-2">Ухо</th>
                          <th className="text-left py-1 px-2">Частота</th>
                          <th className="text-center py-1 px-2">дБ</th>
                          <th className="text-center py-1 px-2">Действие</th>
                          <th className="text-center py-1 px-2">Ответ</th>
                          <th className="text-center py-1 px-2">Награда</th>
                        </tr>
                        </thead>
                        <tbody>
                        {virtualResult.steps_log.map((s, i) => (
                            <tr key={i} className="border-b border-gray-800 hover:bg-gray-800">
                              <td className="py-1 px-2 text-gray-500">{s.step}</td>
                              <td className="py-1 px-2" style={{ color: earColor(s.ear) }}>{earIcon(s.ear)}</td>
                              <td className="py-1 px-2">{s.frequency}</td>
                              <td className="py-1 px-2 text-center text-blue-300">{s.db_level}</td>
                              <td className={`py-1 px-2 text-center font-bold ${actionColor(s.action)}`}>{s.action}</td>
                              <td className="py-1 px-2 text-center">{s.heard ? "✅" : "❌"}</td>
                              <td className={`py-1 px-2 text-center ${s.reward > 0 ? "text-green-400" : s.reward < 0 ? "text-red-400" : "text-gray-400"}`}>
                                {s.reward}
                              </td>
                            </tr>
                        ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>)}
              </div>
          )}

          {/* ═══ Real Test ═══ */}
          {tab === "real" && (
              <div className="space-y-6">
                {!realActive && !realDone && (
                    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                      <h2 className="text-lg font-semibold mb-3">🎧 Тест реального слуха</h2>
                      <p className="text-gray-400 text-sm mb-2">
                        Наденьте <strong>стерео-наушники</strong>. ИНС будет подавать тоны поочерёдно
                        в каждое ухо и адаптивно подбирать громкость.
                      </p>
                      <p className="text-gray-500 text-sm mb-4">
                        Порядок: <span className="text-red-400 font-medium">Правое ухо</span> (все частоты) →
                        <span className="text-blue-400 font-medium"> Левое ухо</span> (все частоты)
                      </p>
                      <button onClick={handleStartReal} disabled={!connected || !modelLoaded}
                              className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium transition">
                        ▶ Начать тест
                      </button>
                    </div>
                )}

                {realActive && currentTone && (
                    <div className="space-y-6">
                      {/* Прогресс */}
                      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium" style={{ color: earColor(currentTone.ear) }}>
                      {currentTone.ear_label}
                    </span>
                          <span className="text-sm text-gray-400">
                      Частота {currentTone.freq_index + 1}/{currentTone.total_frequencies} · Шагов: {currentTone.steps_on_freq}
                    </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-3 relative">
                          {/* Фон: правое ухо — красный, левое — синий */}
                          <div className="absolute inset-0 flex rounded-full overflow-hidden">
                            <div className="w-1/2 bg-red-900/30"></div>
                            <div className="w-1/2 bg-blue-900/30"></div>
                          </div>
                          <div
                              className="h-3 rounded-full transition-all relative z-10"
                              style={{
                                width: `${(totalProgress / totalFreqs) * 100}%`,
                                backgroundColor: earColor(currentTone.ear),
                              }}
                          ></div>
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-gray-600">
                          <span className="text-red-400/60">R: {FREQUENCIES.map(f => f >= 1000 ? `${f/1000}k` : f).join(" ")}</span>
                          <span className="text-blue-400/60">L: {FREQUENCIES.map(f => f >= 1000 ? `${f/1000}k` : f).join(" ")}</span>
                        </div>
                      </div>

                      {/* Текущий тон */}
                      <div
                          className="bg-gray-900 rounded-xl p-8 border-2 text-center"
                          style={{ borderColor: earColor(currentTone.ear) }}
                      >
                        <div className="flex items-center justify-center gap-3 mb-4">
                          <span className="text-3xl">{currentTone.ear === "right" ? "👂" : "👂"}</span>
                          <span className="text-2xl font-bold" style={{ color: earColor(currentTone.ear) }}>
                      {currentTone.ear_label}
                    </span>
                        </div>

                        <div className="text-4xl font-bold text-white mb-1">{currentTone.frequency} Гц</div>
                        <div className="text-2xl text-gray-300 mb-1">{currentTone.db_level} дБ HL</div>
                        <div className="text-sm text-gray-500 mb-2">
                          Действие: <span className={`font-bold ${actionColor(currentTone.action_name)}`}>{currentTone.action_name}</span>
                        </div>
                        {currentTone.gap != null && (
                            <div className="text-xs text-gray-600 mb-4">
                              Gap: {currentTone.gap} · Min: {currentTone.min_heard ?? "—"} · Max not: {currentTone.max_not_heard ?? "—"}
                            </div>
                        )}

                        <button onClick={handlePlayTone} disabled={playing}
                                className={`px-8 py-3 rounded-full font-medium text-lg mb-6 transition ${
                                    playing ? "bg-yellow-600 text-yellow-100 animate-pulse" : "bg-blue-600 hover:bg-blue-500"
                                }`}>{playing ? "🔊 Воспроизведение..." : "🔊 Воспроизвести тон"}</button>

                        <div className="flex gap-4 justify-center">
                          <button onClick={() => handleRespond(true)}
                                  className="px-10 py-4 bg-green-600 hover:bg-green-500 rounded-xl text-lg font-bold transition hover:scale-105">
                            ✅ Слышу
                          </button>
                          <button onClick={() => handleRespond(false)}
                                  className="px-10 py-4 bg-red-600 hover:bg-red-500 rounded-xl text-lg font-bold transition hover:scale-105">
                            ❌ Не слышу
                          </button>
                        </div>
                      </div>

                      {/* Найденные пороги (прогресс по ушам) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-900 rounded-xl p-4 border border-red-900/30">
                          <h4 className="text-sm font-semibold text-red-400 mb-2">👂 Правое ухо</h4>
                          {Object.keys(currentTone.found_thresholds_right).length > 0 ? (
                              <div className="flex gap-2 flex-wrap">
                                {Object.entries(currentTone.found_thresholds_right).map(([freq, db]) => (
                                    <div key={freq} className="bg-gray-800 px-2 py-1 rounded text-xs">
                                      <span className="text-gray-400">{freq}:</span>{" "}
                                      <span className="text-red-400 font-bold">{db}</span>
                                    </div>
                                ))}
                              </div>
                          ) : (
                              <p className="text-xs text-gray-600">
                                {currentTone.ear === "right" ? "В процессе..." : "Ожидание"}
                              </p>
                          )}
                        </div>
                        <div className="bg-gray-900 rounded-xl p-4 border border-blue-900/30">
                          <h4 className="text-sm font-semibold text-blue-400 mb-2">👂 Левое ухо</h4>
                          {Object.keys(currentTone.found_thresholds_left).length > 0 ? (
                              <div className="flex gap-2 flex-wrap">
                                {Object.entries(currentTone.found_thresholds_left).map(([freq, db]) => (
                                    <div key={freq} className="bg-gray-800 px-2 py-1 rounded text-xs">
                                      <span className="text-gray-400">{freq}:</span>{" "}
                                      <span className="text-blue-400 font-bold">{db}</span>
                                    </div>
                                ))}
                              </div>
                          ) : (
                              <p className="text-xs text-gray-600">Ожидание</p>
                          )}
                        </div>
                      </div>

                      <div className="text-center text-sm text-gray-500">
                        Всего шагов: {currentTone.steps_taken}
                      </div>
                    </div>
                )}

                {/* Реальный тест завершён */}
                {realDone && currentTone && (
                    <div className="space-y-6">
                      <div className="bg-green-900/30 border border-green-700 rounded-xl p-6 text-center">
                        <h2 className="text-xl font-bold text-green-400 mb-2">✅ Тест завершён!</h2>
                        <p className="text-gray-300">Всего шагов: {currentTone.steps_taken}</p>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-gray-900 rounded-xl p-5 border border-red-900/50">
                          <h3 className="text-lg font-semibold text-red-400 mb-3">👂 Правое ухо (R)</h3>
                          <Audiogram
                              thresholds={currentTone.found_thresholds_right}
                              title="Правое ухо"
                              color="#F87171"
                          />
                          <div className="grid grid-cols-4 gap-2 mt-3">
                            {Object.entries(currentTone.found_thresholds_right).map(([freq, db]) => (
                                <div key={freq} className="bg-gray-800 p-2 rounded text-center">
                                  <div className="text-gray-500 text-xs">{freq} Гц</div>
                                  <div className="text-red-400 font-bold">{db} дБ</div>
                                </div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-gray-900 rounded-xl p-5 border border-blue-900/50">
                          <h3 className="text-lg font-semibold text-blue-400 mb-3">👂 Левое ухо (L)</h3>
                          <Audiogram
                              thresholds={currentTone.found_thresholds_left}
                              title="Левое ухо"
                              color="#60A5FA"
                          />
                          <div className="grid grid-cols-4 gap-2 mt-3">
                            {Object.entries(currentTone.found_thresholds_left).map(([freq, db]) => (
                                <div key={freq} className="bg-gray-800 p-2 rounded text-center">
                                  <div className="text-gray-500 text-xs">{freq} Гц</div>
                                  <div className="text-blue-400 font-bold">{db} дБ</div>
                                </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <button onClick={() => { setRealDone(false); setRealActive(false); setCurrentTone(null); }}
                              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition">
                        🔄 Пройти ещё раз
                      </button>
                    </div>
                )}
              </div>
          )}

          {tab === "info" && (
              <div className="space-y-6">
                {modelInfo ? (<>
                  <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <h2 className="text-lg font-semibold mb-4">🧠 Архитектура ИНС</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 mb-2">Общее</h3>
                        <div className="space-y-2 text-sm">
                          <InfoRow label="Алгоритм" value={modelInfo.architecture.type} />
                          <InfoRow label="Policy" value={modelInfo.architecture.policy} />
                          <InfoRow label="Actor" value={modelInfo.architecture.actor} />
                          <InfoRow label="Critic" value={modelInfo.architecture.critic} />
                          <InfoRow label="Уши" value="Правое → Левое (по 7 частот)" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 mb-2">9 действий</h3>
                        <div className="flex flex-wrap gap-2">
                          {modelInfo.architecture.actions.map((a, i) => (
                              <span key={i} className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  a.includes("20") ? "bg-red-900/50 text-red-300" :
                                      a.includes("10") ? "bg-orange-900/50 text-orange-300" :
                                          a.includes("5") && !a.includes("СТОП") ? "bg-yellow-900/50 text-yellow-300" :
                                              a.includes("1") ? "bg-purple-900/50 text-purple-300" :
                                                  "bg-green-900/50 text-green-300"
                              }`}>{a}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <h3 className="text-sm font-semibold text-gray-400 mb-3">
                      Observation ({modelInfo.architecture.observation_dim} признаков)
                    </h3>
                    <div className="space-y-1.5">
                      {modelInfo.architecture.features.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500 font-mono w-8">[{i}]</span>
                            <span className="text-gray-300">{f}</span>
                          </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <h3 className="text-sm font-semibold text-gray-400 mb-3">Процедура тестирования</h3>
                    <div className="space-y-3 text-sm text-gray-300">
                      <div className="flex gap-3 items-start">
                        <span className="text-red-400 text-lg">👂</span>
                        <div>
                          <p className="font-semibold text-red-400">1. Правое ухо</p>
                          <p className="text-gray-500">Проверяются все 7 частот: 125, 250, 500, 1000, 2000, 4000, 8000 Гц</p>
                        </div>
                      </div>
                      <div className="flex gap-3 items-start">
                        <span className="text-blue-400 text-lg">👂</span>
                        <div>
                          <p className="font-semibold text-blue-400">2. Левое ухо</p>
                          <p className="text-gray-500">Повторяются все 7 частот для другого уха</p>
                        </div>
                      </div>
                      <div className="flex gap-3 items-start">
                        <span className="text-green-400 text-lg">📊</span>
                        <div>
                          <p className="font-semibold text-green-400">3. Результаты</p>
                          <p className="text-gray-500">Две аудиограммы + классификация для каждого уха</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <h3 className="text-sm font-semibold text-gray-400 mb-3">Стратегия агента</h3>
                    <div className="space-y-3 text-sm text-gray-300">
                      {[
                        ["1️⃣", "Грубый поиск (±20 дБ)", "Начинает с 60 дБ, крупными прыжками находит зону порога", "text-red-400"],
                        ["2️⃣", "Средний поиск (±10 дБ)", "Сужает зону порога средними шагами", "text-orange-400"],
                        ["3️⃣", "Точный поиск (±5 дБ)", "Уточняет стандартным аудиометрическим шагом", "text-yellow-400"],
                        ["4️⃣", "Тонкий поиск (±1 дБ)", "Находит точный порог с точностью 1 дБ", "text-purple-400"],
                        ["5️⃣", "СТОП", "Когда gap ≤ 1, порог найден. ~8-12 шагов/частота", "text-green-400"],
                      ].map(([emoji, title, desc, color]) => (
                          <div key={title} className="flex gap-3">
                            <span className="text-2xl">{emoji}</span>
                            <div>
                              <p className={`font-semibold ${color}`}>{title}</p>
                              <p className="text-gray-500">{desc}</p>
                            </div>
                          </div>
                      ))}
                    </div>
                  </div>
                </>) : (
                    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-center text-gray-400">
                      {connected ? "Загрузка..." : "Подключитесь к серверу"}
                    </div>
                )}
              </div>
          )}
        </div>

        <footer className="mt-12 pb-6 text-center text-xs text-gray-600">
          Виртуальный аудиометр | PPO + Gymnasium + Stable Baselines3
        </footer>
      </div>
  );
}

function StatCard({ label, value, color = "blue" }: { label: string; value: string; color?: string }) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
  };
  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${colorMap[color] || colorMap.blue}`}>{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
      <div className="flex justify-between">
        <span className="text-gray-500">{label}:</span>
        <span className="text-gray-300 font-mono text-xs">{value}</span>
      </div>
  );
}
