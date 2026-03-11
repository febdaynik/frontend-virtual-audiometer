import React, { useState, useCallback, useRef, useEffect } from "react";
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

// ═══════════ AudioContext для генерации тонов ═══════════
let audioCtx: AudioContext | null = null;

function playTone(frequency: number, dbLevel: number, durationMs: number = 1000) {
  if (!audioCtx) audioCtx = new AudioContext();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = "sine";
  osc.frequency.value = frequency;

  // dB HL → amplitude (очень грубое приближение)
  const amplitude = Math.pow(10, (dbLevel - 90) / 20) * 0.5;
  const clampedAmp = Math.min(Math.max(amplitude, 0.0001), 1.0);

  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(clampedAmp, now + 0.05);
  gain.gain.setValueAtTime(clampedAmp, now + durationMs / 1000 - 0.05);
  gain.gain.linearRampToValueAtTime(0, now + durationMs / 1000);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + durationMs / 1000);
}

// ═══════════ Аудиограмма (SVG) ═══════════
interface AudiogramProps {
  thresholds: Record<string, number>;
  trueThresholds?: Record<string, number>;
  title: string;
}

function Audiogram({ thresholds, trueThresholds, title }: AudiogramProps) {
  const width = 500;
  const height = 350;
  const padding = { top: 40, right: 30, bottom: 40, left: 55 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const freqLabels = FREQUENCIES.map((f) => (f >= 1000 ? `${f / 1000}k` : `${f}`));

  const xScale = (i: number) => padding.left + (i / (FREQUENCIES.length - 1)) * plotW;
  const yScale = (db: number) => padding.top + (db / 120) * plotH;

  const makePolyline = (data: Record<string, number>, color: string, dashed: boolean = false) => {
    const points: string[] = [];
    FREQUENCIES.forEach((f, i) => {
      const val = data[String(f)];
      if (val !== undefined) {
        points.push(`${xScale(i)},${yScale(val)}`);
      }
    });
    if (points.length < 2) return null;
    return (
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray={dashed ? "6,4" : "none"}
      />
    );
  };

  return (
      <div className="bg-gray-900 rounded-xl p-4">
        <h3 className="text-center text-sm font-semibold text-gray-300 mb-2">{title}</h3>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
          {/* Grid */}
          {[0, 20, 40, 60, 80, 100, 120].map((db) => (
            <g key={db}>
              <line
                x1={padding.left} y1={yScale(db)}
                x2={width - padding.right} y2={yScale(db)}
                stroke="#374151" strokeWidth={1}
              />
              <text
                x={padding.left - 8} y={yScale(db) + 4}
                textAnchor="end" fill="#9CA3AF" fontSize={11}
              >
                {db}
              </text>
            </g>
          ))}
          {FREQUENCIES.map((_, i) => (
              <g key={i}>
                <line
                  x1={xScale(i)} y1={padding.top}
                  x2={xScale(i)} y2={height - padding.bottom}
                  stroke="#374151" strokeWidth={1}
                />
                <text
                  x={xScale(i)} y={height - padding.bottom + 18}
                  textAnchor="middle" fill="#9CA3AF" fontSize={11}
                >
                  {freqLabels[i]}
                </text>
              </g>
          ))}

          {/* Labels */}
          <text x={width / 2} y={height - 5} textAnchor="middle" fill="#9CA3AF" fontSize={12}>
            Частота (Гц)
          </text>
          <text x={14} y={height / 2} textAnchor="middle" fill="#9CA3AF" fontSize={12}
                transform={`rotate(-90, 14, ${height / 2})`}>
            дБ HL
          </text>

          {/* True thresholds (dashed) */}
          {trueThresholds && makePolyline(trueThresholds, "#6B7280", true)}
          {trueThresholds && FREQUENCIES.map((f, i) => {
            const val = trueThresholds[String(f)];
            if (val === undefined) return null;
            return (
                <circle key={`true-${f}`} cx={xScale(i)} cy={yScale(val)} r={4}
                        fill="none" stroke="#6B7280" strokeWidth={1.5} />
            );
          })}

          {/* Found thresholds */}
          {makePolyline(thresholds, "#3B82F6")}
          {FREQUENCIES.map((f, i) => {
            const val = thresholds[String(f)];
            if (val === undefined) return null;
            return (
                <circle key={`found-${f}`} cx={xScale(i)} cy={yScale(val)} r={5}
                        fill="#3B82F6" stroke="#1E40AF" strokeWidth={1.5} />
            );
          })}

          {/* Legend */}
          <circle cx={padding.left + 10} cy={padding.top - 20} r={4} fill="#3B82F6" />
          <text x={padding.left + 20} y={padding.top - 16} fill="#93C5FD" fontSize={10}>
            Найденные пороги
          </text>
          {trueThresholds && (
              <>
                <circle cx={padding.left + 150} cy={padding.top - 20} r={4}
                        fill="none" stroke="#6B7280" strokeWidth={1.5} />
                <text x={padding.left + 160} y={padding.top - 16} fill="#9CA3AF" fontSize={10}>
                  Истинные пороги
                </text>
              </>
          )}
        </svg>
      </div>
  );
}

// ═══════════ Основное приложение ═══════════
type Tab = "virtual" | "real" | "info";

interface StepLogEntry {
  step: number;
  frequency: number;
  db_level: number;
  action: string;
  heard: boolean;
  reward?: number;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("virtual");
  const [connected, setConnected] = useState<boolean | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);

  // Virtual test
  const [virtualResult, setVirtualResult] = useState<VirtualTestResult | null>(null);
  const [virtualLoading, setVirtualLoading] = useState(false);

  // Real test
  const [realActive, setRealActive] = useState(false);
  const [currentTone, setCurrentTone] = useState<ToneResponse | null>(null);
  const [realDone, setRealDone] = useState(false);
  const [, setRealSteps] = useState<StepLogEntry[]>([]);
  const [playing, setPlaying] = useState(false);

  const sessionIdRef = useRef(`session_${Date.now()}`);

  // Check connection
  useEffect(() => {
    checkHealth()
        .then((data) => {
          setConnected(true);
          setModelLoaded(data.model_loaded);
        })
        .catch(() => setConnected(false));

    getModelInfo()
        .then(setModelInfo)
        .catch(() => {});
  }, []);

  // ─── Virtual test ───
  const handleVirtualTest = useCallback(async () => {
    setVirtualLoading(true);
    setVirtualResult(null);
    try {
      const result = await runVirtualTest();
      setVirtualResult(result);
    } catch (e) {
      alert("Ошибка: " + (e as Error).message);
    }
    setVirtualLoading(false);
  }, []);

  // ─── Real test ───
  const handleStartReal = useCallback(async () => {
    sessionIdRef.current = `session_${Date.now()}`;
    setRealSteps([]);
    setRealDone(false);
    try {
      const tone = await startRealTest(sessionIdRef.current);
      setCurrentTone(tone);
      setRealActive(true);
    } catch (e) {
      alert("Ошибка: " + (e as Error).message);
    }
  }, []);

  const handlePlayTone = useCallback(() => {
    if (!currentTone) return;
    setPlaying(true);
    playTone(currentTone.frequency, currentTone.db_level, 1000);
    setTimeout(() => setPlaying(false), 1100);
  }, [currentTone]);

  const handleRespond = useCallback(async (heard: boolean) => {
    if (!currentTone) return;
    try {
      // Log this step
      setRealSteps((prev) => [
        ...prev,
        {
          step: prev.length + 1,
          frequency: currentTone.frequency,
          db_level: currentTone.db_level,
          action: "response",
          heard,
        },
      ]);

      const response = await sendStep(sessionIdRef.current, heard);
      setCurrentTone(response);

      if (response.test_done) {
        setRealDone(true);
        setRealActive(false);
      }
    } catch (e) {
      alert("Ошибка: " + (e as Error).message);
    }
  }, [currentTone]);

  // ═══════════ UI ═══════════
  return (
      <div className="min-h-screen bg-gray-950 text-white">
        {/* Header */}
        <header className="bg-gray-900 border-b border-gray-800 py-4">
          <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-blue-400">🎧 Виртуальный аудиометр</h1>
              <p className="text-sm text-gray-400 mt-1">
                RL-агент (PPO) · 9 действий: ±20, ±10, ±5, ±1, СТОП
              </p>
            </div>
            <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                connected === null ? "bg-gray-700 text-gray-300" :
                    connected ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                  connected === null ? "bg-gray-400" :
                      connected ? "bg-green-400" : "bg-red-400"
              }`}></span>
              {connected === null ? "Проверка..." : connected ? "Сервер подключён" : "Нет связи"}
            </span>
              {connected && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      modelLoaded ? "bg-blue-900 text-blue-300" : "bg-yellow-900 text-yellow-300"
                  }`}>
                {modelLoaded ? "Модель загружена" : "Модель не найдена"}
              </span>
              )}
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 mt-6">
          <div className="flex gap-2 mb-6">
            {(
                [
                  ["virtual", "🤖 Виртуальный пациент"],
                  ["real", "🎧 Реальный тест"],
                  ["info", "🧠 Архитектура ИНС"],
                ] as [Tab, string][]
            ).map(([key, label]) => (
                <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`px-5 py-2.5 rounded-lg font-medium text-sm transition ${
                        tab === key
                            ? "bg-blue-600 text-white"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                >
                  {label}
                </button>
            ))}
          </div>

          {/* ═══ Tab: Virtual Test ═══ */}
          {tab === "virtual" && (
              <div className="space-y-6">
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                  <h2 className="text-lg font-semibold mb-3">Тест виртуального пациента</h2>
                  <p className="text-gray-400 text-sm mb-4">
                    ИНС автоматически проведёт аудиометрию виртуального пациента со случайным профилем слуха.
                    Агент выбирает действия (+20, +10, +5, +1, -1, -5, -10, -20, СТОП) чтобы найти порог на каждой из 7 частот.
                  </p>
                  <button
                      onClick={handleVirtualTest}
                      disabled={virtualLoading || !connected || !modelLoaded}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium transition"
                  >
                    {virtualLoading ? "⏳ Тестирование..." : "▶ Запустить тест"}
                  </button>
                </div>

                {virtualResult && (
                    <>
                      {/* Results summary */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Диагноз" value={virtualResult.diagnosis} />
                        <StatCard label="Ср. ошибка" value={`${virtualResult.avg_error} дБ`}
                                  color={virtualResult.avg_error <= 1 ? "green" : virtualResult.avg_error <= 5 ? "yellow" : "red"} />
                        <StatCard label="Макс. ошибка" value={`${virtualResult.max_error} дБ`}
                                  color={virtualResult.max_error <= 2 ? "green" : virtualResult.max_error <= 5 ? "yellow" : "red"} />
                        <StatCard label="Всего шагов" value={String(virtualResult.total_steps)} />
                      </div>

                      {/* Audiogram */}
                      <Audiogram
                          thresholds={virtualResult.found_thresholds}
                          trueThresholds={virtualResult.true_thresholds}
                          title="Аудиограмма виртуального пациента"
                      />

                      {/* Frequency details */}
                      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <h3 className="font-semibold mb-3">Детали по частотам</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                            <tr className="border-b border-gray-700 text-gray-400">
                              <th className="text-left py-2 px-3">Частота</th>
                              <th className="text-center py-2 px-3">Истинный порог</th>
                              <th className="text-center py-2 px-3">Найденный</th>
                              <th className="text-center py-2 px-3">Ошибка</th>
                              <th className="text-center py-2 px-3">Статус</th>
                            </tr>
                            </thead>
                            <tbody>
                            {FREQUENCIES.map((f) => {
                              const trueVal = virtualResult.true_thresholds[String(f)];
                              const foundVal = virtualResult.found_thresholds[String(f)];
                              const error = virtualResult.errors[String(f)];
                              return (
                                  <tr key={f} className="border-b border-gray-800">
                                    <td className="py-2 px-3 font-medium">{f} Гц</td>
                                    <td className="py-2 px-3 text-center text-gray-400">{trueVal ?? "—"} дБ</td>
                                    <td className="py-2 px-3 text-center text-blue-400">{foundVal ?? "—"} дБ</td>
                                    <td className="py-2 px-3 text-center">{error ?? "—"} дБ</td>
                                    <td className="py-2 px-3 text-center">
                                      {error === 0 ? "✅" : error !== undefined && error <= 5 ? "⚠️" : "❌"}
                                    </td>
                                  </tr>
                              );
                            })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Classification */}
                      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <h3 className="font-semibold mb-2">Классификация</h3>
                        <p className="text-lg text-blue-400">{virtualResult.classification}</p>
                      </div>

                      {/* Steps log */}
                      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <h3 className="font-semibold mb-3">Лог действий агента</h3>
                        <div className="max-h-64 overflow-y-auto">
                          <table className="w-full text-xs font-mono">
                            <thead>
                            <tr className="text-gray-500 border-b border-gray-700">
                              <th className="text-left py-1 px-2">#</th>
                              <th className="text-left py-1 px-2">Частота</th>
                              <th className="text-center py-1 px-2">дБ</th>
                              <th className="text-center py-1 px-2">Действие</th>
                              <th className="text-center py-1 px-2">Слышит</th>
                              <th className="text-center py-1 px-2">Награда</th>
                            </tr>
                            </thead>
                            <tbody>
                            {virtualResult.steps_log.map((s, i) => (
                                <tr key={i} className="border-b border-gray-800 hover:bg-gray-800">
                                  <td className="py-1 px-2 text-gray-500">{s.step}</td>
                                  <td className="py-1 px-2">{s.frequency} Гц</td>
                                  <td className="py-1 px-2 text-center text-blue-300">{s.db_level}</td>
                                  <td className={`py-1 px-2 text-center font-bold ${
                                      s.action === "СТОП" ? "text-green-400" :
                                          s.action.includes("+") ? "text-yellow-400" : "text-purple-400"
                                  }`}>{s.action}</td>
                                  <td className="py-1 px-2 text-center">
                                    {s.heard === true ? "✅" : s.heard === false ? "❌" : "—"}
                                  </td>
                                  <td className={`py-1 px-2 text-center ${
                                      s.reward > 0 ? "text-green-400" : s.reward < 0 ? "text-red-400" : "text-gray-400"
                                  }`}>{s.reward}</td>
                                </tr>
                            ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                )}
              </div>
          )}

          {/* ═══ Tab: Real Test ═══ */}
          {tab === "real" && (
              <div className="space-y-6">
                {!realActive && !realDone && (
                    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                      <h2 className="text-lg font-semibold mb-3">🎧 Тест реального слуха</h2>
                      <p className="text-gray-400 text-sm mb-4">
                        Наденьте наушники. ИНС будет подавать тоны разных частот и громкостей.
                        Нажмите «Слышу» или «Не слышу» после каждого тона.
                        Агент сам решит какую громкость подать следующей.
                      </p>
                      <button
                          onClick={handleStartReal}
                          disabled={!connected || !modelLoaded}
                          className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium transition"
                      >
                        ▶ Начать тест
                      </button>
                    </div>
                )}

                {realActive && currentTone && (
                    <div className="space-y-6">
                      {/* Progress */}
                      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400">Прогресс</span>
                          <span className="text-sm text-gray-400">
                      Частота {currentTone.freq_index + 1} / {currentTone.total_frequencies}
                    </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${((currentTone.freq_index) / currentTone.total_frequencies) * 100}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-gray-500">
                          {FREQUENCIES.map((f, i) => (
                              <span key={f} className={i === currentTone.freq_index ? "text-blue-400 font-bold" : ""}>
                        {f >= 1000 ? `${f/1000}k` : f}
                      </span>
                          ))}
                        </div>
                      </div>

                      {/* Current tone info */}
                      <div className="bg-gray-900 rounded-xl p-8 border border-blue-800 text-center">
                        <p className="text-gray-400 text-sm mb-2">Текущий тон</p>
                        <div className="text-4xl font-bold text-blue-400 mb-1">
                          {currentTone.frequency} Гц
                        </div>
                        <div className="text-2xl text-gray-300 mb-1">
                          {currentTone.db_level} дБ HL
                        </div>
                        <div className="text-sm text-gray-500 mb-4">
                          Действие агента: <span className="text-yellow-400">{currentTone.action_name}</span>
                        </div>
                        {currentTone.gap !== null && currentTone.gap !== undefined && (
                            <div className="text-xs text-gray-500 mb-4">
                              Gap: {currentTone.gap} дБ |
                              Min heard: {currentTone.min_heard ?? "—"} |
                              Max not heard: {currentTone.max_not_heard ?? "—"}
                            </div>
                        )}

                        {/* Play button */}
                        <button
                            onClick={handlePlayTone}
                            disabled={playing}
                            className={`px-8 py-3 rounded-full font-medium text-lg mb-6 transition ${
                                playing
                                    ? "bg-yellow-600 text-yellow-100 animate-pulse"
                                    : "bg-blue-600 hover:bg-blue-500 text-white"
                            }`}
                        >
                          {playing ? "🔊 Воспроизведение..." : "🔊 Воспроизвести тон"}
                        </button>

                        {/* Response buttons */}
                        <div className="flex gap-4 justify-center">
                          <button
                              onClick={() => handleRespond(true)}
                              className="px-10 py-4 bg-green-600 hover:bg-green-500 rounded-xl text-lg font-bold transition transform hover:scale-105"
                          >
                            ✅ Слышу
                          </button>
                          <button
                              onClick={() => handleRespond(false)}
                              className="px-10 py-4 bg-red-600 hover:bg-red-500 rounded-xl text-lg font-bold transition transform hover:scale-105"
                          >
                            ❌ Не слышу
                          </button>
                        </div>
                      </div>

                      {/* Found thresholds so far */}
                      {Object.keys(currentTone.found_thresholds).length > 0 && (
                          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                            <h3 className="font-semibold mb-2 text-sm">Найденные пороги</h3>
                            <div className="flex gap-4 flex-wrap">
                              {Object.entries(currentTone.found_thresholds).map(([freq, db]) => (
                                  <div key={freq} className="bg-gray-800 px-3 py-2 rounded-lg text-sm">
                                    <span className="text-gray-400">{freq} Гц:</span>{" "}
                                    <span className="text-blue-400 font-bold">{db} дБ</span>
                                  </div>
                              ))}
                            </div>
                          </div>
                      )}

                      {/* Steps counter */}
                      <div className="text-center text-sm text-gray-500">
                        Шагов: {currentTone.steps_taken}
                      </div>
                    </div>
                )}

                {/* Real test done */}
                {realDone && currentTone && (
                    <div className="space-y-6">
                      <div className="bg-green-900/30 border border-green-700 rounded-xl p-6 text-center">
                        <h2 className="text-xl font-bold text-green-400 mb-2">✅ Тест завершён!</h2>
                        <p className="text-gray-300">Всего шагов: {currentTone.steps_taken}</p>
                      </div>

                      <Audiogram
                          thresholds={currentTone.found_thresholds}
                          title="Ваша аудиограмма"
                      />

                      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <h3 className="font-semibold mb-3">Результаты</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {Object.entries(currentTone.found_thresholds).map(([freq, db]) => (
                              <div key={freq} className="bg-gray-800 p-3 rounded-lg text-center">
                                <div className="text-gray-400 text-xs">{freq} Гц</div>
                                <div className="text-xl font-bold text-blue-400">{db} дБ</div>
                              </div>
                          ))}
                        </div>
                      </div>

                      <button
                          onClick={() => {
                            setRealDone(false);
                            setRealActive(false);
                            setCurrentTone(null);
                            setRealSteps([]);
                          }}
                          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition"
                      >
                        🔄 Пройти ещё раз
                      </button>
                    </div>
                )}
              </div>
          )}

          {/* ═══ Tab: Model Info ═══ */}
          {tab === "info" && (
              <div className="space-y-6">
                {modelInfo ? (
                    <>
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
                            </div>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-400 mb-2">Действия</h3>
                            <div className="flex flex-wrap gap-2">
                              {modelInfo.architecture.actions.map((a, i) => (
                                  <span key={i} className="bg-gray-800 px-3 py-1 rounded-full text-sm text-blue-300">
                            {a}
                          </span>
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
                                <span className="text-gray-500 font-mono w-6">[{i}]</span>
                                <span className="text-gray-300">{f}</span>
                              </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                        <h3 className="text-sm font-semibold text-gray-400 mb-3">Система наград</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                            <tr className="border-b border-gray-700 text-gray-400">
                              <th className="text-left py-2 px-3">Условие</th>
                              <th className="text-center py-2 px-3">Награда</th>
                            </tr>
                            </thead>
                            <tbody className="text-gray-300">
                            <tr className="border-b border-gray-800">
                              <td className="py-2 px-3">СТОП при gap=1 (идеально)</td>
                              <td className="py-2 px-3 text-center text-green-400 font-bold">+50</td>
                            </tr>
                            <tr className="border-b border-gray-800">
                              <td className="py-2 px-3">СТОП при gap≤2</td>
                              <td className="py-2 px-3 text-center text-green-400">+30</td>
                            </tr>
                            <tr className="border-b border-gray-800">
                              <td className="py-2 px-3">Сужение gap до 1</td>
                              <td className="py-2 px-3 text-center text-green-400">+10</td>
                            </tr>
                            <tr className="border-b border-gray-800">
                              <td className="py-2 px-3">Каждый шаг</td>
                              <td className="py-2 px-3 text-center text-red-400">-0.3</td>
                            </tr>
                            <tr className="border-b border-gray-800">
                              <td className="py-2 px-3">Бессмысленное действие</td>
                              <td className="py-2 px-3 text-center text-red-400">-3</td>
                            </tr>
                            <tr className="border-b border-gray-800">
                              <td className="py-2 px-3">±1 при большом gap</td>
                              <td className="py-2 px-3 text-center text-red-400">-2</td>
                            </tr>
                            <tr className="border-b border-gray-800">
                              <td className="py-2 px-3">Превышение лимита шагов</td>
                              <td className="py-2 px-3 text-center text-red-400 font-bold">-20</td>
                            </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                ) : (
                    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-center text-gray-400">
                      {connected ? "Загрузка информации о модели..." : "Подключитесь к серверу"}
                    </div>
                )}
              </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-12 pb-6 text-center text-xs text-gray-600">
          Виртуальный аудиометр | PPO + Gymnasium + Stable Baselines3
        </footer>
      </div>
  );
}

// ═══════════ Helper components ═══════════
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
