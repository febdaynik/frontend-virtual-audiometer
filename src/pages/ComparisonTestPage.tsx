import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  FlaskConical,
  Play,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Clock,
  Target,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Users,
} from 'lucide-react';
import {
  checkHealth,
  getComparisonMethods,
  runComparison,
  type ComparisonMethod,
  type HearingProfile,
  type ComparisonResult,
} from '../api/audiometer';

const FREQUENCIES = [250, 500, 1000, 2000, 4000, 8000];

export default function ComparisonTestPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [methods, setMethods] = useState<ComparisonMethod[]>([]);
  const [profiles, setProfiles] = useState<HearingProfile[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('random');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);

  // Load methods on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const health = await checkHealth();
        setIsConnected(health.status === 'ok' && health.model_loaded);

        const data = await getComparisonMethods();
        setMethods(data.methods);
        setProfiles(data.hearing_profiles);

        // Select first 3 methods by default
        if (data.methods.length > 0) {
          setSelectedMethods(data.methods.slice(0, 3).map(m => m.id));
        }
      } catch (e) {
        setIsConnected(false);
        setError('Не удалось загрузить методы сравнения');
      }
    };
    loadData();
  }, []);

  const toggleMethod = (methodId: string) => {
    setSelectedMethods(prev =>
        prev.includes(methodId)
            ? prev.filter(m => m !== methodId)
            : [...prev, methodId]
    );
  };

  const handleRunComparison = async () => {
    if (selectedMethods.length === 0) {
      setError('Выберите хотя бы один метод');
      return;
    }

    setIsRunning(true);
    setError(null);
    setResults(null);

    try {
      // Запускаем ВСЕ выбранные методы через один endpoint
      // Бэкенд сгенерирует одного пациента для всех методов
      const compResult = await runComparison(selectedMethods, selectedProfile, true);
      setResults(compResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка тестирования');
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setResults(null);
    setError(null);
    setExpandedMethod(null);
  };

  const cardClass = `rounded-2xl p-6 ${dark ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}`;

  const getErrorColor = (error: number) => {
    const absError = Math.abs(error);
    if (absError <= 5) return 'text-emerald-500';
    if (absError <= 10) return 'text-yellow-500';
    if (absError <= 15) return 'text-orange-500';
    return 'text-red-500';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}м ${secs}с`;
    }
    return `${secs}с`;
  };

  // Sort results by avg_error
  const sortedResults = results?.results.slice().sort((a, b) => a.avg_error - b.avg_error) || [];
  const bestMethod = sortedResults[0];

  // Audiogram helpers
  const AUDIOGRAM = {
    width: 650,
    height: 300,
    paddingLeft: 60,
    paddingRight: 30,
    paddingTop: 30,
    paddingBottom: 50,
    minDb: -10,
    maxDb: 120,
  };

  const getAudiogramX = (freqIndex: number) => {
    const plotWidth = AUDIOGRAM.width - AUDIOGRAM.paddingLeft - AUDIOGRAM.paddingRight;
    return AUDIOGRAM.paddingLeft + (freqIndex / (FREQUENCIES.length - 1)) * plotWidth;
  };

  const getAudiogramY = (db: number) => {
    const plotHeight = AUDIOGRAM.height - AUDIOGRAM.paddingTop - AUDIOGRAM.paddingBottom;
    const normalizedDb = (db - AUDIOGRAM.minDb) / (AUDIOGRAM.maxDb - AUDIOGRAM.minDb);
    return AUDIOGRAM.paddingTop + normalizedDb * plotHeight;
  };

  const methodColors: Record<string, string> = {
    neural_network: '#14b8a6',
    hughson_westlake: '#8b5cf6',
    bekesy: '#f59e0b',
    binary_search: '#3b82f6',
    ascending: '#ec4899',
    staircase: '#10b981',
  };

  return (
      <div className="min-h-screen p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-indigo-500/20">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-800'}`}>
                Сравнительное тестирование
              </h1>
              <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                Сравнение методов скрининга на виртуальном пациенте
              </p>
            </div>
          </div>
        </div>

        {/* Connection status */}
        <div className={`${cardClass} mb-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                  isConnected === null ? 'bg-yellow-500 animate-pulse' : isConnected ? 'bg-emerald-500' : 'bg-red-500'
              }`} />
              <span className={`text-sm font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
              {isConnected === null ? 'Подключение...' : isConnected ? 'Сервер доступен' : 'Сервер недоступен'}
            </span>
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

        {/* Configuration */}
        {!results && (
            <div className="grid grid-cols-12 gap-6 mb-6">
              {/* Method selection */}
              <div className="col-span-8">
                <div className={cardClass}>
                  <h3 className={`text-lg font-semibold mb-4 ${dark ? 'text-white' : 'text-slate-800'}`}>
                    Выберите методы для сравнения
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {methods.map(method => (
                        <button
                            key={method.id}
                            onClick={() => toggleMethod(method.id)}
                            disabled={isRunning}
                            className={`text-left p-4 rounded-xl border-2 transition-all ${
                                selectedMethods.includes(method.id)
                                    ? method.id === 'neural_network'
                                        ? 'border-teal-500 bg-teal-500/10'
                                        : dark ? 'border-indigo-500 bg-indigo-500/10' : 'border-indigo-500 bg-indigo-50'
                                    : dark ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
                            } disabled:opacity-50`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                selectedMethods.includes(method.id)
                                    ? method.id === 'neural_network' ? 'border-teal-500 bg-teal-500' : 'border-indigo-500 bg-indigo-500'
                                    : dark ? 'border-slate-500' : 'border-slate-300'
                            }`}>
                              {selectedMethods.includes(method.id) && (
                                  <CheckCircle2 className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <span className={`font-semibold text-sm ${
                                method.id === 'neural_network'
                                    ? 'text-teal-500'
                                    : dark ? 'text-white' : 'text-slate-800'
                            }`}>
                        {method.name}
                      </span>
                            {method.id === 'neural_network' && (
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-teal-500/20 text-teal-500">
                          ИНС
                        </span>
                            )}
                          </div>
                          <p className={`text-xs leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {method.description}
                          </p>
                        </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Profile and actions */}
              <div className="col-span-4 space-y-6">
                <div className={cardClass}>
                  <h3 className={`text-base font-semibold mb-3 ${dark ? 'text-white' : 'text-slate-800'}`}>
                    <Users className="w-4 h-4 inline mr-2" />
                    Профиль пациента
                  </h3>
                  <select
                      value={selectedProfile}
                      onChange={(e) => setSelectedProfile(e.target.value)}
                      disabled={isRunning}
                      className={`w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all outline-none ${
                          dark
                              ? 'bg-slate-700 border border-slate-600 text-white'
                              : 'bg-slate-50 border border-slate-200 text-slate-800'
                      } disabled:opacity-50`}
                  >
                    {profiles.map(profile => (
                        <option key={profile.id} value={profile.id}>
                          {profile.name}
                        </option>
                    ))}
                  </select>
                  <p className={`mt-2 text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {profiles.find(p => p.id === selectedProfile)?.description}
                  </p>
                </div>

                <button
                    onClick={handleRunComparison}
                    disabled={isRunning || !isConnected || selectedMethods.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isRunning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  {isRunning ? 'Тестирование...' : 'Запустить сравнение'}
                </button>

                <div className={`p-4 rounded-xl ${dark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <strong>Выбрано методов:</strong> {selectedMethods.length}
                  </p>
                  <p className={`text-xs mt-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Каждый метод будет протестирован на одном и том же виртуальном пациенте для честного сравнения.
                  </p>
                </div>
              </div>
            </div>
        )}

        {/* Loading */}
        {isRunning && (
            <div className={`${cardClass} flex flex-col items-center justify-center py-20`}>
              <Loader2 className={`w-12 h-12 mb-4 animate-spin ${dark ? 'text-cyan-400' : 'text-cyan-600'}`} />
              <h3 className={`text-lg font-semibold mb-2 ${dark ? 'text-white' : 'text-slate-800'}`}>
                Тестирование методов...
              </h3>
              <p className={`text-sm text-center ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                Выполняется сравнение {selectedMethods.length} методов на виртуальном пациенте
              </p>
            </div>
        )}

        {/* Results */}
        {results && !isRunning && (
            <>
              {/* Patient info */}
              <div className={`${cardClass} mb-6`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-lg font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
                      Виртуальный пациент
                    </h3>
                    <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Профиль: {results.patient.hearing_profile_name}
                    </p>
                  </div>
                  <button
                      onClick={handleReset}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          dark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Новое сравнение
                  </button>
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className={cardClass}>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                      <Trophy className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Лучший метод
                      </p>
                      <p className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>
                        {bestMethod?.method_name.split(' ')[0]}
                      </p>
                    </div>
                  </div>
                </div>
                <div className={cardClass}>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
                      <Target className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Лучшая точность
                      </p>
                      <p className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>
                        {bestMethod?.avg_error.toFixed(1)} дБ
                      </p>
                    </div>
                  </div>
                </div>
                <div className={cardClass}>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Мин. шагов
                      </p>
                      <p className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>
                        {Math.min(...sortedResults.map(r => r.total_steps))}
                      </p>
                    </div>
                  </div>
                </div>
                <div className={cardClass}>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/10 to-violet-500/5">
                      <Clock className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Мин. время
                      </p>
                      <p className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>
                        {formatTime(Math.min(...sortedResults.map(r => r.time_estimate_seconds)))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ranking table */}
              <div className={`${cardClass} mb-6`}>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className={`w-5 h-5 ${dark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  <h3 className={`text-lg font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
                    Рейтинг методов
                  </h3>
                </div>
                <div className={`rounded-xl overflow-hidden ${dark ? 'border border-slate-700/50' : 'border border-slate-200'}`}>
                  <table className="w-full">
                    <thead>
                    <tr className={dark ? 'bg-slate-800' : 'bg-slate-50'}>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                        #
                      </th>
                      <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Метод
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Ср. ошибка
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Макс. ошибка
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Шагов
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Время
                      </th>
                      <th className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Детали
                      </th>
                    </tr>
                    </thead>
                    <tbody className={`divide-y ${dark ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                    {sortedResults.map((result, index) => (
                        <tr
                            key={result.method}
                            className={`transition-colors ${
                                index === 0
                                    ? dark ? 'bg-amber-900/10' : 'bg-amber-50'
                                    : dark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'
                            }`}
                        >
                          <td className={`px-4 py-3`}>
                            {index === 0 ? (
                                <Trophy className="w-5 h-5 text-amber-500" />
                            ) : (
                                <span className={`text-sm font-bold ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {index + 1}
                          </span>
                            )}
                          </td>
                          <td className={`px-4 py-3`}>
                            <div className="flex items-center gap-2">
                              <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: methodColors[result.method] || '#6b7280' }}
                              />
                              <span className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
                            {result.method_name}
                          </span>
                            </div>
                          </td>
                          <td className={`px-4 py-3 text-center`}>
                        <span className={`text-sm font-bold ${getErrorColor(result.avg_error)}`}>
                          {result.avg_error.toFixed(1)} дБ
                        </span>
                          </td>
                          <td className={`px-4 py-3 text-center`}>
                        <span className={`text-sm font-medium ${getErrorColor(result.max_error)}`}>
                          {result.max_error} дБ
                        </span>
                          </td>
                          <td className={`px-4 py-3 text-center text-sm font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                            {result.total_steps}
                          </td>
                          <td className={`px-4 py-3 text-center text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                            ~{formatTime(result.time_estimate_seconds)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                                onClick={() => setExpandedMethod(expandedMethod === result.method ? null : result.method)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                    dark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'
                                }`}
                            >
                              {expandedMethod === result.method ? (
                                  <ChevronUp className={`w-4 h-4 ${dark ? 'text-slate-400' : 'text-slate-500'}`} />
                              ) : (
                                  <ChevronDown className={`w-4 h-4 ${dark ? 'text-slate-400' : 'text-slate-500'}`} />
                              )}
                            </button>
                          </td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Expanded method details */}
              {expandedMethod && (
                  <div className={`${cardClass} mb-6`}>
                    {(() => {
                      const methodResult = results.results.find(r => r.method === expandedMethod);
                      if (!methodResult) return null;

                      return (
                          <>
                            <h3 className={`text-lg font-semibold mb-4 ${dark ? 'text-white' : 'text-slate-800'}`}>
                              Детали: {methodResult.method_name}
                            </h3>

                            {/* Thresholds table */}
                            <div className={`rounded-xl overflow-hidden mb-4 ${dark ? 'border border-slate-700/50' : 'border border-slate-200'}`}>
                              <table className="w-full text-sm">
                                <thead>
                                <tr className={dark ? 'bg-slate-800' : 'bg-slate-50'}>
                                  <th className={`px-3 py-2 text-left text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Частота</th>
                                  <th className={`px-3 py-2 text-center text-xs font-semibold ${dark ? 'text-rose-400' : 'text-rose-600'}`}>Правое (найдено)</th>
                                  <th className={`px-3 py-2 text-center text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Правое (истина)</th>
                                  <th className={`px-3 py-2 text-center text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Ошибка</th>
                                  <th className={`px-3 py-2 text-center text-xs font-semibold ${dark ? 'text-blue-400' : 'text-blue-600'}`}>Левое (найдено)</th>
                                  <th className={`px-3 py-2 text-center text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Левое (истина)</th>
                                  <th className={`px-3 py-2 text-center text-xs font-semibold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Ошибка</th>
                                </tr>
                                </thead>
                                <tbody className={`divide-y ${dark ? 'divide-slate-700/30' : 'divide-slate-100'}`}>
                                {FREQUENCIES.map(freq => {
                                  const fStr = freq.toString();
                                  return (
                                      <tr key={freq}>
                                        <td className={`px-3 py-2 font-medium ${dark ? 'text-white' : 'text-slate-800'}`}>{freq} Гц</td>
                                        <td className={`px-3 py-2 text-center ${dark ? 'text-rose-400' : 'text-rose-600'}`}>{methodResult.found_thresholds_right[fStr]} дБ</td>
                                        <td className={`px-3 py-2 text-center ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{methodResult.true_thresholds_right[fStr]} дБ</td>
                                        <td className={`px-3 py-2 text-center font-bold ${getErrorColor(methodResult.errors_right[fStr])}`}>
                                          {methodResult.errors_right[fStr] > 0 ? '+' : ''}{methodResult.errors_right[fStr]}
                                        </td>
                                        <td className={`px-3 py-2 text-center ${dark ? 'text-blue-400' : 'text-blue-600'}`}>{methodResult.found_thresholds_left[fStr]} дБ</td>
                                        <td className={`px-3 py-2 text-center ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{methodResult.true_thresholds_left[fStr]} дБ</td>
                                        <td className={`px-3 py-2 text-center font-bold ${getErrorColor(methodResult.errors_left[fStr])}`}>
                                          {methodResult.errors_left[fStr] > 0 ? '+' : ''}{methodResult.errors_left[fStr]}
                                        </td>
                                      </tr>
                                  );
                                })}
                                </tbody>
                              </table>
                            </div>

                            {/* Steps log preview */}
                            {methodResult.steps_log.length > 0 && (
                                <details className={`rounded-xl ${dark ? 'bg-slate-900' : 'bg-slate-900'}`}>
                                  <summary className={`px-4 py-3 cursor-pointer text-sm font-medium text-slate-400`}>
                                    Лог шагов ({methodResult.steps_log.length} шагов)
                                  </summary>
                                  <div className="max-h-48 overflow-y-auto px-4 pb-3">
                                    <div className="font-mono text-xs space-y-0.5">
                                      {methodResult.steps_log.slice(0, 50).map((step, i) => (
                                          <div key={i} className="flex gap-2">
                                            <span className="text-slate-500 w-8">[{step.step}]</span>
                                            <span className={step.ear === 'right' ? 'text-rose-400' : 'text-blue-400'}>
                                  {step.ear_label}
                                </span>
                                            <span className="text-slate-300">{step.frequency}Гц</span>
                                            <span className="text-amber-400">{step.db_level}дБ</span>
                                            <span className={step.heard ? 'text-emerald-400' : 'text-red-400'}>
                                  {step.heard ? '✓' : '✗'}
                                </span>
                                            {step.action && <span className="text-slate-500">{step.action}</span>}
                                          </div>
                                      ))}
                                      {methodResult.steps_log.length > 50 && (
                                          <div className="text-slate-500">... и ещё {methodResult.steps_log.length - 50} шагов</div>
                                      )}
                                    </div>
                                  </div>
                                </details>
                            )}
                          </>
                      );
                    })()}
                  </div>
              )}

              {/* Comparative audiogram */}
              <div className={cardClass}>
                <h3 className={`text-lg font-semibold mb-4 ${dark ? 'text-white' : 'text-slate-800'}`}>
                  Сравнительная аудиограмма (левое и правое ухо)
                </h3>
                <div className="flex justify-center">
                  {/* Left */}
                  <svg
                      viewBox={`0 0 ${AUDIOGRAM.width} ${AUDIOGRAM.height}`}
                      className="w-full max-w-2xl"
                      style={{height: '300px'}}
                  >
                    {/* Background */}
                    <rect
                        x={AUDIOGRAM.paddingLeft}
                        y={AUDIOGRAM.paddingTop}
                        width={AUDIOGRAM.width - AUDIOGRAM.paddingLeft - AUDIOGRAM.paddingRight}
                        height={AUDIOGRAM.height - AUDIOGRAM.paddingTop - AUDIOGRAM.paddingBottom}
                        fill={dark ? '#1e293b' : '#f8fafc'}
                    />

                    {/* Normal zone */}
                    <rect
                        x={AUDIOGRAM.paddingLeft}
                        y={AUDIOGRAM.paddingTop}
                        width={AUDIOGRAM.width - AUDIOGRAM.paddingLeft - AUDIOGRAM.paddingRight}
                        height={getAudiogramY(25) - AUDIOGRAM.paddingTop}
                        fill={dark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.08)'}
                    />

                    {/* Grid */}
                    {[-10, 0, 20, 40, 60, 80, 100, 120].map(db => (
                        <g key={`db-${db}`}>
                          <line
                              x1={AUDIOGRAM.paddingLeft}
                              y1={getAudiogramY(db)}
                              x2={AUDIOGRAM.width - AUDIOGRAM.paddingRight}
                              y2={getAudiogramY(db)}
                              stroke={dark ? '#334155' : '#e2e8f0'}
                              strokeWidth={1}
                          />
                          <text
                              x={AUDIOGRAM.paddingLeft - 8}
                              y={getAudiogramY(db) + 4}
                              textAnchor="end"
                              fill={dark ? '#94a3b8' : '#64748b'}
                              fontSize={10}
                          >
                            {db}
                          </text>
                        </g>
                    ))}
                    {FREQUENCIES.map((freq, i) => (
                        <g key={`freq-${freq}`}>
                          <line
                              x1={getAudiogramX(i)}
                              y1={AUDIOGRAM.paddingTop}
                              x2={getAudiogramX(i)}
                              y2={AUDIOGRAM.height - AUDIOGRAM.paddingBottom}
                              stroke={dark ? '#334155' : '#e2e8f0'}
                              strokeWidth={1}
                          />
                          <text
                              x={getAudiogramX(i)}
                              y={AUDIOGRAM.height - AUDIOGRAM.paddingBottom + 20}
                              textAnchor="middle"
                              fill={dark ? '#94a3b8' : '#64748b'}
                              fontSize={11}
                          >
                            {freq >= 1000 ? `${freq / 1000}k` : freq}
                          </text>
                        </g>
                    ))}

                    {/* True thresholds (black dashed) */}
                    <polyline
                        points={FREQUENCIES.map((f, i) => {
                          const db = results.patient.true_thresholds_left[f.toString()];
                          return `${getAudiogramX(i)},${getAudiogramY(db)}`;
                        }).join(' ')}
                        fill="none"
                        stroke={dark ? '#94a3b8' : '#374151'}
                        strokeWidth={3}
                        strokeDasharray="8,4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {FREQUENCIES.map((f, i) => {
                      const db = results.patient.true_thresholds_left[f.toString()];
                      return (
                          <circle
                              key={`true-${f}`}
                              cx={getAudiogramX(i)}
                              cy={getAudiogramY(db)}
                              r={6}
                              fill={dark ? '#1e293b' : 'white'}
                              stroke={dark ? '#94a3b8' : '#374151'}
                              strokeWidth={2}
                          />
                      );
                    })}

                    {/* Method results */}
                    {sortedResults.map((result, methodIndex) => {
                      const color = methodColors[result.method] || '#6b7280';
                      const offset = (methodIndex - sortedResults.length / 2) * 2;

                      return (
                          <g key={result.method}>
                            <polyline
                                points={FREQUENCIES.map((f, i) => {
                                  const db = result.found_thresholds_left[f.toString()];
                                  return `${getAudiogramX(i) + offset},${getAudiogramY(db)}`;
                                }).join(' ')}
                                fill="none"
                                stroke={color}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={0.8}
                            />
                            {FREQUENCIES.map((f, i) => {
                              const db = result.found_thresholds_left[f.toString()];
                              return (
                                  <circle
                                      key={`${result.method}-${f}`}
                                      cx={getAudiogramX(i) + offset}
                                      cy={getAudiogramY(db)}
                                      r={4}
                                      fill={color}
                                      opacity={0.9}
                                  />
                              );
                            })}
                          </g>
                      );
                    })}
                  </svg>

                  {/* Right */}
                  <svg
                      viewBox={`0 0 ${AUDIOGRAM.width} ${AUDIOGRAM.height}`}
                      className="w-full max-w-2xl"
                      style={{height: '300px'}}
                  >
                    {/* Background */}
                    <rect
                        x={AUDIOGRAM.paddingLeft}
                        y={AUDIOGRAM.paddingTop}
                        width={AUDIOGRAM.width - AUDIOGRAM.paddingLeft - AUDIOGRAM.paddingRight}
                        height={AUDIOGRAM.height - AUDIOGRAM.paddingTop - AUDIOGRAM.paddingBottom}
                        fill={dark ? '#1e293b' : '#f8fafc'}
                    />

                    {/* Normal zone */}
                    <rect
                        x={AUDIOGRAM.paddingLeft}
                        y={AUDIOGRAM.paddingTop}
                        width={AUDIOGRAM.width - AUDIOGRAM.paddingLeft - AUDIOGRAM.paddingRight}
                        height={getAudiogramY(25) - AUDIOGRAM.paddingTop}
                        fill={dark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.08)'}
                    />

                    {/* Grid */}
                    {[-10, 0, 20, 40, 60, 80, 100, 120].map(db => (
                        <g key={`db-${db}`}>
                          <line
                              x1={AUDIOGRAM.paddingLeft}
                              y1={getAudiogramY(db)}
                              x2={AUDIOGRAM.width - AUDIOGRAM.paddingRight}
                              y2={getAudiogramY(db)}
                              stroke={dark ? '#334155' : '#e2e8f0'}
                              strokeWidth={1}
                          />
                          <text
                              x={AUDIOGRAM.paddingLeft - 8}
                              y={getAudiogramY(db) + 4}
                              textAnchor="end"
                              fill={dark ? '#94a3b8' : '#64748b'}
                              fontSize={10}
                          >
                            {db}
                          </text>
                        </g>
                    ))}
                    {FREQUENCIES.map((freq, i) => (
                        <g key={`freq-${freq}`}>
                          <line
                              x1={getAudiogramX(i)}
                              y1={AUDIOGRAM.paddingTop}
                              x2={getAudiogramX(i)}
                              y2={AUDIOGRAM.height - AUDIOGRAM.paddingBottom}
                              stroke={dark ? '#334155' : '#e2e8f0'}
                              strokeWidth={1}
                          />
                          <text
                              x={getAudiogramX(i)}
                              y={AUDIOGRAM.height - AUDIOGRAM.paddingBottom + 20}
                              textAnchor="middle"
                              fill={dark ? '#94a3b8' : '#64748b'}
                              fontSize={11}
                          >
                            {freq >= 1000 ? `${freq / 1000}k` : freq}
                          </text>
                        </g>
                    ))}

                    {/* True thresholds (black dashed) */}
                    <polyline
                        points={FREQUENCIES.map((f, i) => {
                          const db = results.patient.true_thresholds_right[f.toString()];
                          return `${getAudiogramX(i)},${getAudiogramY(db)}`;
                        }).join(' ')}
                        fill="none"
                        stroke={dark ? '#94a3b8' : '#374151'}
                        strokeWidth={3}
                        strokeDasharray="8,4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {FREQUENCIES.map((f, i) => {
                      const db = results.patient.true_thresholds_right[f.toString()];
                      return (
                          <circle
                              key={`true-${f}`}
                              cx={getAudiogramX(i)}
                              cy={getAudiogramY(db)}
                              r={6}
                              fill={dark ? '#1e293b' : 'white'}
                              stroke={dark ? '#94a3b8' : '#374151'}
                              strokeWidth={2}
                          />
                      );
                    })}

                    {/* Method results */}
                    {sortedResults.map((result, methodIndex) => {
                      const color = methodColors[result.method] || '#6b7280';
                      const offset = (methodIndex - sortedResults.length / 2) * 2;

                      return (
                          <g key={result.method}>
                            <polyline
                                points={FREQUENCIES.map((f, i) => {
                                  const db = result.found_thresholds_right[f.toString()];
                                  return `${getAudiogramX(i) + offset},${getAudiogramY(db)}`;
                                }).join(' ')}
                                fill="none"
                                stroke={color}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={0.8}
                            />
                            {FREQUENCIES.map((f, i) => {
                              const db = result.found_thresholds_right[f.toString()];
                              return (
                                  <circle
                                      key={`${result.method}-${f}`}
                                      cx={getAudiogramX(i) + offset}
                                      cy={getAudiogramY(db)}
                                      r={4}
                                      fill={color}
                                      opacity={0.9}
                                  />
                              );
                            })}
                          </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-0.5 bg-slate-500 rounded" style={{borderTop: '3px dashed'}}/>
                    <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Истинный порог</span>
                  </div>
                  {sortedResults.map(result => (
                      <div key={result.method} className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{backgroundColor: methodColors[result.method] || '#6b7280'}}
                        />
                        <span className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {result.method_name.split(' ')[0]}
                  </span>
                      </div>
                  ))}
                </div>
              </div>
            </>
        )}
      </div>
  );
}
