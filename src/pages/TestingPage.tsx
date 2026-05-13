import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  Users,
  Play,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Target,
  TrendingUp,
  ListOrdered,
  Ear,
  Activity,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  checkHealth,
  runVirtualTest,
  type VirtualTestResult,
  type StepLogEntry,
} from '../api/audiometer';

const FREQUENCIES = [250, 500, 1000, 2000, 4000, 8000];

export default function TestingPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<VirtualTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState(false);

  // Check API health on mount
  useEffect(() => {
    checkHealth()
        .then((res) => setIsConnected(res.status === 'ok' && res.model_loaded))
        .catch(() => setIsConnected(false));
  }, []);

  const handleRunTest = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await runVirtualTest();
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка');
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  const cardClass = `rounded-2xl p-6 ${dark ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}`;

  const getErrorColor = (error: number) => {
    const absError = Math.abs(error);
    if (absError <= 5) return 'text-emerald-500';
    if (absError <= 10) return 'text-yellow-500';
    if (absError <= 15) return 'text-orange-500';
    return 'text-red-500';
  };

  const getErrorBg = (error: number) => {
    const absError = Math.abs(error);
    if (absError <= 5) return dark ? 'bg-emerald-900/20' : 'bg-emerald-50';
    if (absError <= 10) return dark ? 'bg-yellow-900/20' : 'bg-yellow-50';
    if (absError <= 15) return dark ? 'bg-orange-900/20' : 'bg-orange-50';
    return dark ? 'bg-red-900/20' : 'bg-red-50';
  };

  return (
      <div className="min-h-screen p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-violet-500/20">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-800'}`}>
                Виртуальное тестирование
              </h1>
              <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                Тестирование ИНС на виртуальном пациенте с известными порогами слышимости
              </p>
            </div>
          </div>
        </div>

        {/* Connection status */}
        <div className={`${cardClass} mb-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                  isConnected === null
                      ? 'bg-yellow-500 animate-pulse'
                      : isConnected
                          ? 'bg-emerald-500'
                          : 'bg-red-500'
              }`} />
              <span className={`text-sm font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
              {isConnected === null
                  ? 'Подключение к серверу...'
                  : isConnected
                      ? 'Сервер доступен, модель загружена'
                      : 'Сервер недоступен'
              }
            </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                  onClick={handleRunTest}
                  disabled={isRunning || !isConnected}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                {isRunning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                {isRunning ? 'Тестирование...' : 'Запустить тест'}
              </button>
              {result && (
                  <button
                      onClick={handleReset}
                      className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
                          dark
                              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Сбросить
                  </button>
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
            <div className={`${cardClass} mb-6 !border-red-500/30 ${dark ? 'bg-red-900/10' : 'bg-red-50'}`}>
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-500 font-medium">{error}</span>
              </div>
            </div>
        )}

        {/* Results */}
        {result && (
            <>
              {/* Summary metrics */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Средняя ошибка', value: `${result.avg_error.toFixed(1)} дБ`, icon: Target, color: 'text-teal-500', bg: dark ? 'from-teal-500/10 to-teal-500/5' : 'from-teal-50 to-teal-25' },
                  { label: 'Макс. ошибка', value: `${result.max_error.toFixed(0)} дБ`, icon: TrendingUp, color: result.max_error <= 10 ? 'text-emerald-500' : result.max_error <= 15 ? 'text-yellow-500' : 'text-red-500', bg: dark ? 'from-orange-500/10 to-orange-500/5' : 'from-orange-50 to-orange-25' },
                  { label: 'Всего шагов', value: result.total_steps.toString(), icon: ListOrdered, color: 'text-violet-500', bg: dark ? 'from-violet-500/10 to-violet-500/5' : 'from-violet-50 to-violet-25' },
                  { label: 'Шагов на частоту', value: (result.total_steps / (FREQUENCIES.length * 2)).toFixed(1), icon: Activity, color: 'text-blue-500', bg: dark ? 'from-blue-500/10 to-blue-500/5' : 'from-blue-50 to-blue-25' },
                ].map((m) => (
                    <div key={m.label} className={cardClass}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${m.bg}`}>
                          <m.icon className={`w-5 h-5 ${m.color}`} />
                        </div>
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {m.label}
                          </p>
                          <p className={`text-2xl font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>{m.value}</p>
                        </div>
                      </div>
                    </div>
                ))}
              </div>

              {/* Diagnosis */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Right ear */}
                <div className={`${cardClass} !border-l-4 !border-l-rose-500`}>
                  <div className="flex items-center gap-2 mb-4">
                    <Ear className="w-5 h-5 text-rose-500" />
                    <h3 className={`text-base font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
                      Правое ухо
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className={`text-xs font-medium mb-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Диагноз</p>
                      <p className={`text-lg font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>{result.diagnosis_right}</p>
                    </div>
                    <div>
                      <p className={`text-xs font-medium mb-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Классификация</p>
                      <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-medium ${
                          result.classification_right === 'Норма'
                              ? dark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                              : result.classification_right.includes('лёгкая') || result.classification_right.includes('Лёгкая')
                                  ? dark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                                  : dark ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700'
                      }`}>
                    {result.classification_right}
                  </span>
                    </div>
                  </div>
                </div>

                {/* Left ear */}
                <div className={`${cardClass} !border-l-4 !border-l-blue-500`}>
                  <div className="flex items-center gap-2 mb-4">
                    <Ear className="w-5 h-5 text-blue-500 scale-x-[-1]" />
                    <h3 className={`text-base font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
                      Левое ухо
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className={`text-xs font-medium mb-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Диагноз</p>
                      <p className={`text-lg font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>{result.diagnosis_left}</p>
                    </div>
                    <div>
                      <p className={`text-xs font-medium mb-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Классификация</p>
                      <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-medium ${
                          result.classification_left === 'Норма'
                              ? dark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                              : result.classification_left.includes('лёгкая') || result.classification_left.includes('Лёгкая')
                                  ? dark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                                  : dark ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700'
                      }`}>
                    {result.classification_left}
                  </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Thresholds comparison table */}
              <div className={`${cardClass} mb-6`}>
                <h3 className={`text-lg font-semibold mb-4 ${dark ? 'text-white' : 'text-slate-800'}`}>
                  Сравнение порогов слышимости
                </h3>
                <div className={`rounded-xl overflow-hidden ${dark ? 'border border-slate-700/50' : 'border border-slate-200'}`}>
                  <table className="w-full">
                    <thead>
                    <tr className={dark ? 'bg-slate-800' : 'bg-slate-50'}>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Частота
                      </th>
                      <th colSpan={3} className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider border-l ${dark ? 'text-rose-400 border-slate-700' : 'text-rose-600 border-slate-200'}`}>
                        Правое ухо →
                      </th>
                      <th colSpan={3} className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider border-l ${dark ? 'text-blue-400 border-slate-700' : 'text-blue-600 border-slate-200'}`}>
                        ← Левое ухо
                      </th>
                    </tr>
                    <tr className={dark ? 'bg-slate-800/50' : 'bg-slate-25'}>
                      <th className={`px-4 py-2 text-left text-xs font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}></th>
                      <th className={`px-4 py-2 text-center text-xs font-medium border-l ${dark ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-200'}`}>Найдено</th>
                      <th className={`px-4 py-2 text-center text-xs font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Истина</th>
                      <th className={`px-4 py-2 text-center text-xs font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Ошибка</th>
                      <th className={`px-4 py-2 text-center text-xs font-medium border-l ${dark ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-200'}`}>Найдено</th>
                      <th className={`px-4 py-2 text-center text-xs font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Истина</th>
                      <th className={`px-4 py-2 text-center text-xs font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Ошибка</th>
                    </tr>
                    </thead>
                    <tbody className={`divide-y ${dark ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                    {FREQUENCIES.map((freq) => {
                      const freqStr = freq.toString();
                      const foundR = result.found_thresholds_right[freqStr];
                      const trueR = result.true_thresholds_right[freqStr];
                      const errorR = result.errors_right[freqStr];
                      const foundL = result.found_thresholds_left[freqStr];
                      const trueL = result.true_thresholds_left[freqStr];
                      const errorL = result.errors_left[freqStr];

                      return (
                          <tr key={freq} className={`${dark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'} transition-colors`}>
                            <td className={`px-4 py-3 text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
                              {freq} Гц
                            </td>
                            {/* Right ear */}
                            <td className={`px-4 py-3 text-center text-sm font-medium border-l ${dark ? 'text-slate-300 border-slate-700' : 'text-slate-700 border-slate-200'}`}>
                              {foundR !== undefined ? `${foundR} дБ` : '—'}
                            </td>
                            <td className={`px-4 py-3 text-center text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {trueR !== undefined ? `${trueR} дБ` : '—'}
                            </td>
                            <td className={`px-4 py-3 text-center`}>
                              {errorR !== undefined ? (
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${getErrorColor(errorR)} ${getErrorBg(errorR)}`}>
                              {errorR > 0 ? '+' : ''}{errorR} дБ
                            </span>
                              ) : '—'}
                            </td>
                            {/* Left ear */}
                            <td className={`px-4 py-3 text-center text-sm font-medium border-l ${dark ? 'text-slate-300 border-slate-700' : 'text-slate-700 border-slate-200'}`}>
                              {foundL !== undefined ? `${foundL} дБ` : '—'}
                            </td>
                            <td className={`px-4 py-3 text-center text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {trueL !== undefined ? `${trueL} дБ` : '—'}
                            </td>
                            <td className={`px-4 py-3 text-center`}>
                              {errorL !== undefined ? (
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${getErrorColor(errorL)} ${getErrorBg(errorL)}`}>
                              {errorL > 0 ? '+' : ''}{errorL} дБ
                            </span>
                              ) : '—'}
                            </td>
                          </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Audiogram visualization */}
              <div className={`${cardClass} mb-6`}>
                <h3 className={`text-lg font-semibold mb-4 ${dark ? 'text-white' : 'text-slate-800'}`}>
                  Аудиограмма: найденные vs истинные пороги
                </h3>
                <div className="flex justify-center">
                  <svg
                      viewBox="0 0 650 320"
                      className="w-full max-w-2xl"
                      style={{ height: '320px' }}
                  >
                    {/* Constants for audiogram */}
                    {(() => {
                      const paddingLeft = 60;
                      const paddingRight = 30;
                      const paddingTop = 30;
                      const paddingBottom = 50;
                      const width = 650;
                      const height = 320;
                      const minDb = -10;
                      const maxDb = 120;
                      const plotWidth = width - paddingLeft - paddingRight;
                      const plotHeight = height - paddingTop - paddingBottom;

                      const getX = (freqIndex: number) => paddingLeft + (freqIndex / (FREQUENCIES.length - 1)) * plotWidth;
                      const getY = (db: number) => paddingTop + ((db - minDb) / (maxDb - minDb)) * plotHeight;

                      const dbLevels = [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];

                      return (
                          <>
                            {/* Background */}
                            <rect
                                x={paddingLeft}
                                y={paddingTop}
                                width={plotWidth}
                                height={plotHeight}
                                fill={dark ? '#1e293b' : '#f8fafc'}
                            />

                            {/* Normal hearing zone */}
                            <rect
                                x={paddingLeft}
                                y={paddingTop}
                                width={plotWidth}
                                height={getY(25) - paddingTop}
                                fill={dark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.08)'}
                            />

                            {/* Horizontal grid lines */}
                            {dbLevels.map(db => (
                                <g key={`db-${db}`}>
                                  <line
                                      x1={paddingLeft}
                                      y1={getY(db)}
                                      x2={width - paddingRight}
                                      y2={getY(db)}
                                      stroke={db === 25 ? (dark ? '#22c55e' : '#16a34a') : (dark ? '#334155' : '#e2e8f0')}
                                      strokeWidth={db === 25 ? 1.5 : 1}
                                      strokeDasharray={db === 25 ? '4,4' : 'none'}
                                  />
                                  <text
                                      x={paddingLeft - 8}
                                      y={getY(db) + 4}
                                      textAnchor="end"
                                      fill={dark ? '#94a3b8' : '#64748b'}
                                      fontSize={10}
                                  >
                                    {db}
                                  </text>
                                </g>
                            ))}

                            {/* Vertical grid lines */}
                            {FREQUENCIES.map((freq, i) => (
                                <g key={`freq-${freq}`}>
                                  <line
                                      x1={getX(i)}
                                      y1={paddingTop}
                                      x2={getX(i)}
                                      y2={height - paddingBottom}
                                      stroke={dark ? '#334155' : '#e2e8f0'}
                                      strokeWidth={1}
                                  />
                                  <text
                                      x={getX(i)}
                                      y={height - paddingBottom + 20}
                                      textAnchor="middle"
                                      fill={dark ? '#94a3b8' : '#64748b'}
                                      fontSize={11}
                                      fontWeight={500}
                                  >
                                    {freq >= 1000 ? `${freq / 1000}k` : freq}
                                  </text>
                                </g>
                            ))}

                            {/* Y axis label */}
                            <text
                                x={15}
                                y={height / 2}
                                textAnchor="middle"
                                transform={`rotate(-90, 15, ${height / 2})`}
                                fill={dark ? '#64748b' : '#94a3b8'}
                                fontSize={11}
                            >
                              Уровень слуха (дБ)
                            </text>

                            {/* X axis label */}
                            <text
                                x={width / 2}
                                y={height - 5}
                                textAnchor="middle"
                                fill={dark ? '#64748b' : '#94a3b8'}
                                fontSize={11}
                            >
                              Частота (Гц)
                            </text>

                            {/* True thresholds - dashed lines */}
                            {/* Right ear - true */}
                            <polyline
                                points={FREQUENCIES.map((f, i) => {
                                  const db = result.true_thresholds_right[f.toString()];
                                  if (db === undefined) return null;
                                  return `${getX(i)},${getY(db)}`;
                                }).filter(Boolean).join(' ')}
                                fill="none"
                                stroke="#f43f5e"
                                strokeWidth={2}
                                strokeDasharray="6,4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={0.5}
                            />
                            {FREQUENCIES.map((f, i) => {
                              const db = result.true_thresholds_right[f.toString()];
                              if (db === undefined) return null;
                              return (
                                  <circle
                                      key={`tr-${f}`}
                                      cx={getX(i)}
                                      cy={getY(db)}
                                      r={4}
                                      fill="none"
                                      stroke="#f43f5e"
                                      strokeWidth={1.5}
                                      opacity={0.5}
                                  />
                              );
                            })}

                            {/* Left ear - true */}
                            <polyline
                                points={FREQUENCIES.map((f, i) => {
                                  const db = result.true_thresholds_left[f.toString()];
                                  if (db === undefined) return null;
                                  return `${getX(i)},${getY(db)}`;
                                }).filter(Boolean).join(' ')}
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                strokeDasharray="6,4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={0.5}
                            />
                            {FREQUENCIES.map((f, i) => {
                              const db = result.true_thresholds_left[f.toString()];
                              if (db === undefined) return null;
                              return (
                                  <g key={`tl-${f}`} opacity={0.5}>
                                    <line
                                        x1={getX(i) - 4}
                                        y1={getY(db) - 4}
                                        x2={getX(i) + 4}
                                        y2={getY(db) + 4}
                                        stroke="#3b82f6"
                                        strokeWidth={1.5}
                                        strokeLinecap="round"
                                    />
                                    <line
                                        x1={getX(i) + 4}
                                        y1={getY(db) - 4}
                                        x2={getX(i) - 4}
                                        y2={getY(db) + 4}
                                        stroke="#3b82f6"
                                        strokeWidth={1.5}
                                        strokeLinecap="round"
                                    />
                                  </g>
                              );
                            })}

                            {/* Found thresholds - solid lines */}
                            {/* Right ear - found */}
                            <polyline
                                points={FREQUENCIES.map((f, i) => {
                                  const db = result.found_thresholds_right[f.toString()];
                                  if (db === undefined) return null;
                                  return `${getX(i)},${getY(db)}`;
                                }).filter(Boolean).join(' ')}
                                fill="none"
                                stroke="#f43f5e"
                                strokeWidth={2.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {FREQUENCIES.map((f, i) => {
                              const db = result.found_thresholds_right[f.toString()];
                              if (db === undefined) return null;
                              return (
                                  <g key={`fr-${f}`}>
                                    <circle
                                        cx={getX(i)}
                                        cy={getY(db)}
                                        r={8}
                                        fill="none"
                                        stroke="#f43f5e"
                                        strokeWidth={2.5}
                                    />
                                    <text
                                        x={getX(i)}
                                        y={getY(db) + 4}
                                        textAnchor="middle"
                                        fill="#f43f5e"
                                        fontSize={10}
                                        fontWeight="bold"
                                    >
                                      O
                                    </text>
                                  </g>
                              );
                            })}

                            {/* Left ear - found */}
                            <polyline
                                points={FREQUENCIES.map((f, i) => {
                                  const db = result.found_thresholds_left[f.toString()];
                                  if (db === undefined) return null;
                                  return `${getX(i)},${getY(db)}`;
                                }).filter(Boolean).join(' ')}
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth={2.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {FREQUENCIES.map((f, i) => {
                              const db = result.found_thresholds_left[f.toString()];
                              if (db === undefined) return null;
                              return (
                                  <g key={`fl-${f}`}>
                                    <line
                                        x1={getX(i) - 6}
                                        y1={getY(db) - 6}
                                        x2={getX(i) + 6}
                                        y2={getY(db) + 6}
                                        stroke="#3b82f6"
                                        strokeWidth={2.5}
                                        strokeLinecap="round"
                                    />
                                    <line
                                        x1={getX(i) + 6}
                                        y1={getY(db) - 6}
                                        x2={getX(i) - 6}
                                        y2={getY(db) + 6}
                                        stroke="#3b82f6"
                                        strokeWidth={2.5}
                                        strokeLinecap="round"
                                    />
                                  </g>
                              );
                            })}
                          </>
                      );
                    })()}
                  </svg>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <svg width="20" height="16" viewBox="0 0 20 16">
                      <circle cx="10" cy="8" r="6" fill="none" stroke="#f43f5e" strokeWidth="2" />
                      <text x="10" y="11" textAnchor="middle" fill="#f43f5e" fontSize="8" fontWeight="bold">O</text>
                    </svg>
                    <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Правое (найдено)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="20" height="16" viewBox="0 0 20 16">
                      <circle cx="10" cy="8" r="5" fill="none" stroke="#f43f5e" strokeWidth="1.5" opacity="0.5" />
                    </svg>
                    <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Правое (истина)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="20" height="16" viewBox="0 0 20 16">
                      <line x1="4" y1="2" x2="16" y2="14" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                      <line x1="16" y1="2" x2="4" y2="14" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                    <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Левое (найдено)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="20" height="16" viewBox="0 0 20 16">
                      <line x1="6" y1="4" x2="14" y2="12" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
                      <line x1="14" y1="4" x2="6" y2="12" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
                    </svg>
                    <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Левое (истина)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-3 rounded" style={{ background: dark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.15)' }} />
                    <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Норма (≤25 дБ)</span>
                  </div>
                </div>
              </div>

              {/* Steps log */}
              <div className={cardClass}>
                <button
                    onClick={() => setExpandedLog(!expandedLog)}
                    className={`w-full flex items-center justify-between text-left`}
                >
                  <h3 className={`text-lg font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
                    Лог шагов тестирования ({result.steps_log.length} шагов)
                  </h3>
                  {expandedLog ? (
                      <ChevronUp className={`w-5 h-5 ${dark ? 'text-slate-400' : 'text-slate-500'}`} />
                  ) : (
                      <ChevronDown className={`w-5 h-5 ${dark ? 'text-slate-400' : 'text-slate-500'}`} />
                  )}
                </button>

                {expandedLog && (
                    <div className={`mt-4 rounded-xl overflow-hidden ${dark ? 'border border-slate-700/50' : 'border border-slate-200'}`}>
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full">
                          <thead className="sticky top-0">
                          <tr className={dark ? 'bg-slate-800' : 'bg-slate-50'}>
                            <th className={`px-3 py-2 text-left text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>#</th>
                            <th className={`px-3 py-2 text-left text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Ухо</th>
                            <th className={`px-3 py-2 text-center text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Частота</th>
                            <th className={`px-3 py-2 text-center text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Уровень</th>
                            <th className={`px-3 py-2 text-center text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Действие</th>
                            <th className={`px-3 py-2 text-center text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Слышит</th>
                            <th className={`px-3 py-2 text-right text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Награда</th>
                          </tr>
                          </thead>
                          <tbody className={`divide-y ${dark ? 'divide-slate-700/30' : 'divide-slate-100'}`}>
                          {result.steps_log.map((step: StepLogEntry) => (
                              <tr key={step.step} className={`${dark ? 'hover:bg-slate-700/20' : 'hover:bg-slate-50'} transition-colors`}>
                                <td className={`px-3 py-2 text-xs font-mono ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{step.step}</td>
                                <td className={`px-3 py-2`}>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                step.ear === 'right'
                                    ? dark ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-100 text-rose-700'
                                    : dark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {step.ear_label}
                            </span>
                                </td>
                                <td className={`px-3 py-2 text-center text-xs font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                                  {step.frequency} Гц
                                </td>
                                <td className={`px-3 py-2 text-center text-xs font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                                  {step.db_level} дБ
                                </td>
                                <td className={`px-3 py-2 text-center`}>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                dark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {step.action}
                            </span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {step.heard ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                                  ) : (
                                      <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                                  )}
                                </td>
                                <td className={`px-3 py-2 text-right text-xs font-mono ${
                                    step.reward > 0 ? 'text-emerald-500' : step.reward < 0 ? 'text-red-400' : dark ? 'text-slate-500' : 'text-slate-400'
                                }`}>
                                  {step.reward > 0 ? '+' : ''}{step.reward.toFixed(2)}
                                </td>
                              </tr>
                          ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                )}
              </div>
            </>
        )}

        {/* Empty state */}
        {!result && !isRunning && !error && (
            <div className={`${cardClass} flex flex-col items-center justify-center py-20`}>
              <Users className={`w-16 h-16 mb-4 ${dark ? 'text-slate-600' : 'text-slate-300'}`} />
              <h3 className={`text-lg font-semibold mb-2 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                Готово к тестированию
              </h3>
              <p className={`text-sm text-center max-w-md ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                Нажмите «Запустить тест» для симуляции скрининга виртуального пациента.
                ИНС определит пороги слышимости и результаты сравнятся с истинными значениями.
              </p>
            </div>
        )}

        {/* Loading state */}
        {isRunning && (
            <div className={`${cardClass} flex flex-col items-center justify-center py-20`}>
              <Loader2 className={`w-12 h-12 mb-4 animate-spin ${dark ? 'text-teal-400' : 'text-teal-500'}`} />
              <h3 className={`text-lg font-semibold mb-2 ${dark ? 'text-white' : 'text-slate-800'}`}>
                Тестирование виртуального пациента...
              </h3>
              <p className={`text-sm text-center ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                ИНС проводит скрининг и определяет пороги слышимости
              </p>
            </div>
        )}
      </div>
  );
}
