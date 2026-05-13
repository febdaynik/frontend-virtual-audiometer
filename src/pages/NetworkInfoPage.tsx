import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  BrainCircuit,
  Layers,
  Cpu,
  Zap,
  GitBranch,
  Target,
  Database,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  Server,
} from 'lucide-react';
import { getModelInfo, checkHealth, type ModelInfo } from '../api/audiometer';

export default function NetworkInfoPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  const loadInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const health = await checkHealth();
      setIsConnected(health.status === 'ok' && health.model_loaded);
      const info = await getModelInfo();
      setModelInfo(info);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInfo();
  }, []);

  const cardClass = `rounded-2xl p-6 ${dark ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}`;

  if (loading) {
    return (
        <div className="min-h-screen p-8 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className={`w-12 h-12 animate-spin mx-auto mb-4 ${dark ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Загрузка информации о модели...</p>
          </div>
        </div>
    );
  }

  return (
      <div className="min-h-screen p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-amber-500/20">
                <BrainCircuit className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-800'}`}>
                  Информация о нейросети
                </h1>
                <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Архитектура и параметры ИНС для адаптивного скрининга
                </p>
              </div>
            </div>
            <button
                onClick={loadInfo}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    dark
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              <RefreshCw className="w-4 h-4" />
              Обновить
            </button>
          </div>
        </div>

        {/* Connection status */}
        <div className={`${cardClass} mb-6`}>
          <div className="flex items-center gap-3">
            <Server className={`w-5 h-5 ${isConnected ? 'text-emerald-500' : 'text-red-500'}`} />
            <div>
            <span className={`text-sm font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
              Статус сервера:
            </span>
              <span className={`ml-2 text-sm font-semibold ${isConnected ? 'text-emerald-500' : 'text-red-500'}`}>
              {isConnected ? 'Подключено' : 'Недоступен'}
            </span>
            </div>
            {modelInfo?.loaded && (
                <span className={`ml-4 px-3 py-1 rounded-full text-xs font-medium ${
                    dark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                }`}>
              Модель загружена
            </span>
            )}
          </div>
        </div>

        {error && (
            <div className={`${cardClass} mb-6 !border-red-500/30 ${dark ? 'bg-red-900/10' : 'bg-red-50'}`}>
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-500 font-medium">{error}</span>
              </div>
            </div>
        )}

        {modelInfo && (
            <>
              {/* Architecture info from API */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Тип модели', value: modelInfo.architecture.type, icon: BrainCircuit, color: 'text-violet-500', bg: dark ? 'from-violet-500/10 to-violet-500/5' : 'from-violet-50 to-violet-25' },
                  { label: 'Размерность наблюдения', value: modelInfo.architecture.observation_dim.toString(), icon: Target, color: 'text-teal-500', bg: dark ? 'from-teal-500/10 to-teal-500/5' : 'from-teal-50 to-teal-25' },
                  { label: 'Размерность действий', value: modelInfo.architecture.action_dim.toString(), icon: Zap, color: 'text-amber-500', bg: dark ? 'from-amber-500/10 to-amber-500/5' : 'from-amber-50 to-amber-25' },
                  { label: 'Макс. шагов на частоту', value: modelInfo.max_steps_per_freq.toString(), icon: Cpu, color: 'text-blue-500', bg: dark ? 'from-blue-500/10 to-blue-500/5' : 'from-blue-50 to-blue-25' },
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
                          <p className={`text-xl font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>{m.value}</p>
                        </div>
                      </div>
                    </div>
                ))}
              </div>

              <div className="grid grid-cols-12 gap-6">
                {/* Architecture visualization */}
                <div className="col-span-8">
                  <div className={cardClass}>
                    <div className="flex items-center gap-2 mb-6">
                      <Layers className={`w-5 h-5 ${dark ? 'text-amber-400' : 'text-amber-600'}`} />
                      <h3 className={`text-lg font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
                        Архитектура модели
                      </h3>
                    </div>

                    {/* Policy info */}
                    <div className={`rounded-xl p-5 mb-6 ${dark ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Policy</p>
                          <p className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>{modelInfo.architecture.policy}</p>
                        </div>
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Actor</p>
                          <p className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>{modelInfo.architecture.actor}</p>
                        </div>
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Critic</p>
                          <p className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>{modelInfo.architecture.critic}</p>
                        </div>
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Тип</p>
                          <p className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>{modelInfo.architecture.type}</p>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="mb-6">
                      <h4 className={`text-sm font-semibold mb-3 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Входные признаки (observation)
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {modelInfo.architecture.features.map((f, i) => (
                            <span key={i} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                                dark ? 'bg-teal-900/30 text-teal-400 border border-teal-500/20' : 'bg-teal-50 text-teal-700 border border-teal-200'
                            }`}>
                        {f}
                      </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mb-6">
                      <h4 className={`text-sm font-semibold mb-3 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Возможные действия (actions)
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {modelInfo.architecture.actions.map((a, i) => (
                            <span key={i} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                                dark ? 'bg-violet-900/30 text-violet-400 border border-violet-500/20' : 'bg-violet-50 text-violet-700 border border-violet-200'
                            }`}>
                        {a}
                      </span>
                        ))}
                      </div>
                    </div>

                    {/* Visual flow */}
                    <div className="flex items-center justify-center gap-3 py-6">
                      <div className={`px-4 py-3 rounded-xl text-center ${dark ? 'bg-blue-900/30 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                        <div className={`text-xs font-medium mb-1 ${dark ? 'text-blue-400' : 'text-blue-600'}`}>Input</div>
                        <div className={`text-lg font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>{modelInfo.architecture.observation_dim}</div>
                      </div>
                      <ArrowRight className={`w-5 h-5 ${dark ? 'text-slate-600' : 'text-slate-300'}`} />
                      <div className={`px-4 py-3 rounded-xl text-center ${dark ? 'bg-violet-900/30 border border-violet-500/30' : 'bg-violet-50 border border-violet-200'}`}>
                        <div className={`text-xs font-medium mb-1 ${dark ? 'text-violet-400' : 'text-violet-600'}`}>Actor Network</div>
                        <div className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>{modelInfo.architecture.actor}</div>
                      </div>
                      <ArrowRight className={`w-5 h-5 ${dark ? 'text-slate-600' : 'text-slate-300'}`} />
                      <div className={`px-4 py-3 rounded-xl text-center ${dark ? 'bg-emerald-900/30 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-200'}`}>
                        <div className={`text-xs font-medium mb-1 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>Output</div>
                        <div className={`text-lg font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>{modelInfo.architecture.action_dim}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Side info */}
                <div className="col-span-4 space-y-6">
                  {/* Frequencies */}
                  <div className={cardClass}>
                    <div className="flex items-center gap-2 mb-4">
                      <Database className={`w-5 h-5 ${dark ? 'text-amber-400' : 'text-amber-600'}`} />
                      <h3 className={`text-base font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
                        Тестируемые частоты
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {modelInfo.frequencies.map((f) => (
                          <span key={f} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                              dark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700'
                          }`}>
                      {f} Гц
                    </span>
                      ))}
                    </div>
                  </div>

                  {/* dB Range */}
                  <div className={cardClass}>
                    <h3 className={`text-base font-semibold mb-4 ${dark ? 'text-white' : 'text-slate-800'}`}>
                      Диапазон громкости
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className={`text-center px-4 py-2 rounded-lg ${dark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <span className={`text-lg font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>
                      {modelInfo.db_range[0]}
                    </span>
                        <span className={`text-xs ml-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>дБ</span>
                      </div>
                      <div className={`flex-1 h-1 mx-4 rounded-full ${dark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                        <div className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full" />
                      </div>
                      <div className={`text-center px-4 py-2 rounded-lg ${dark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <span className={`text-lg font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>
                      {modelInfo.db_range[1]}
                    </span>
                        <span className={`text-xs ml-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>дБ</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className={cardClass}>
                    <div className="flex items-center gap-2 mb-4">
                      <GitBranch className={`w-5 h-5 ${dark ? 'text-amber-400' : 'text-amber-600'}`} />
                      <h3 className={`text-base font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
                        Описание
                      </h3>
                    </div>
                    <div className={`space-y-3 text-sm leading-relaxed ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                      <p>
                        Модель использует алгоритм обучения с подкреплением для адаптивного определения порогов слышимости.
                      </p>
                      <p>
                        На каждом шаге агент наблюдает текущее состояние (частоту, громкость, историю ответов) и выбирает оптимальное действие.
                      </p>
                      <p>
                        Цель — минимизировать количество шагов для точного определения порога при каждой частоте.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
        )}

        {!modelInfo && !loading && !error && (
            <div className={`${cardClass} flex flex-col items-center justify-center py-20`}>
              <BrainCircuit className={`w-16 h-16 mb-4 ${dark ? 'text-slate-600' : 'text-slate-300'}`} />
              <h3 className={`text-lg font-semibold mb-2 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                Нет данных
              </h3>
              <p className={`text-sm text-center max-w-sm ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                Не удалось загрузить информацию о модели. Проверьте подключение к серверу.
              </p>
            </div>
        )}
      </div>
  );
}
