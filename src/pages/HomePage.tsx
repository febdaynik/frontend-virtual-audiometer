import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  AudioLines,
  Play,
  Pause,
  Volume2,
  Ear,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  AlertCircle,
  Wifi,
  WifiOff,
  VolumeX,
  Volume1,
} from 'lucide-react';
import {
  checkHealth,
  startRealTest,
  sendStep,
  type ToneResponse,
} from '../api/audiometer';
import { audioGenerator } from '../utils/audioGenerator';

type ScreeningState = 'idle' | 'connecting' | 'running' | 'finished' | 'error';

const FREQUENCIES = [250, 500, 1000, 2000, 4000, 8000];

export default function HomePage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [state, setState] = useState<ScreeningState>('idle');
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [sessionId, setSessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
  const [currentTone, setCurrentTone] = useState<ToneResponse | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultsRight, setResultsRight] = useState<Record<string, number>>({});
  const [resultsLeft, setResultsLeft] = useState<Record<string, number>>({});
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const [waitingForResponse, setWaitingForResponse] = useState(false);

  const playTimeoutRef = useRef<number | null>(null);

  // Check connection on mount
  useEffect(() => {
    checkHealth()
        .then((res) => setIsConnected(res.status === 'ok' && res.model_loaded))
        .catch(() => setIsConnected(false));

    // Cleanup audio on unmount
    return () => {
      audioGenerator.stop();
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
      }
    };
  }, []);

  // Play sound when currentTone changes
  const playCurrentTone = useCallback(async () => {
    if (!currentTone || isPaused || state !== 'running') return;

    setIsPlayingSound(true);
    setWaitingForResponse(false);

    try {
      // Конвертируем ear в формат для аудио
      const earChannel = currentTone.ear === 'left' ? 'left' : 'right';

      // Воспроизводим пульсирующий тон (как в реальной аудиометрии)
      await audioGenerator.playPulsedTone(
          currentTone.frequency,
          currentTone.db_level,
          earChannel,
          1500, // 1.5 секунды общая длительность
          250,  // 250ms тон
          150   // 150ms пауза
      );

      // После окончания звука ждём ответа
      playTimeoutRef.current = window.setTimeout(() => {
        setIsPlayingSound(false);
        setWaitingForResponse(true);
      }, 1600);

    } catch (e) {
      console.error('Error playing tone:', e);
      setIsPlayingSound(false);
      setWaitingForResponse(true);
    }
  }, [currentTone, isPaused, state]);

  // Replay sound when currentTone changes
  useEffect(() => {
    if (currentTone && state === 'running' && !isPaused) {
      // Небольшая задержка перед воспроизведением нового тона
      const timeout = setTimeout(() => {
        playCurrentTone();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [currentTone?.frequency, currentTone?.db_level, currentTone?.ear, state, isPaused]);

  const handleStart = async () => {
    setState('connecting');
    setError(null);
    setResultsRight({});
    setResultsLeft({});

    // Генерируем новый session ID
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setSessionId(newSessionId);

    try {
      // Инициализируем аудио (нужно после user interaction)
      await audioGenerator.init();

      const tone = await startRealTest(newSessionId);
      setCurrentTone(tone);
      setState('running');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка запуска теста');
      setState('error');
    }
  };

  const handleResponse = useCallback(async (heard: boolean) => {
    if (isPaused || !currentTone || isPlayingSound) return;

    // Останавливаем текущий звук
    audioGenerator.stop();
    setIsPlayingSound(false);
    setWaitingForResponse(false);

    try {
      const tone = await sendStep(sessionId, heard);
      setCurrentTone(tone);
      setResultsRight(tone.found_thresholds_right);
      setResultsLeft(tone.found_thresholds_left);

      if (tone.test_done) {
        setState('finished');
        audioGenerator.stop();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка отправки ответа');
      setState('error');
    }
  }, [isPaused, currentTone, sessionId, isPlayingSound]);

  const handleReplaySound = () => {
    if (!isPaused && currentTone && !isPlayingSound) {
      playCurrentTone();
    }
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
    if (!isPaused) {
      audioGenerator.stop();
      setIsPlayingSound(false);
    }
  };

  const handleReset = () => {
    audioGenerator.stop();
    setState('idle');
    setCurrentTone(null);
    setResultsRight({});
    setResultsLeft({});
    setError(null);
    setIsPaused(false);
    setIsPlayingSound(false);
    setWaitingForResponse(false);
  };

  const progress = currentTone
      ? ((currentTone.freq_index * 2 + (currentTone.ear === 'right' ? 0 : 1)) / (currentTone.total_frequencies * 2)) * 100
      : 0;

  const getHearingLevel = (db: number | null) => {
    if (db === null) return { label: '—', color: '' };
    if (db <= 25) return { label: 'Норма', color: 'text-emerald-500' };
    if (db <= 40) return { label: 'Лёгкая', color: 'text-yellow-500' };
    if (db <= 55) return { label: 'Умеренная', color: 'text-orange-500' };
    if (db <= 70) return { label: 'Ср.-тяжёлая', color: 'text-orange-600' };
    if (db <= 90) return { label: 'Тяжёлая', color: 'text-red-500' };
    return { label: 'Глубокая', color: 'text-red-600' };
  };

  // Audiogram rendering helper - фиксированные параметры
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

  return (
      <div className="min-h-screen p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/20">
                <Ear className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-800'}`}>
                  Скрининг слуха
                </h1>
                <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Виртуальный аудиометр с адаптивной настройкой ИНС
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConnected === null ? (
                  <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
              ) : isConnected ? (
                  <Wifi className="w-4 h-4 text-emerald-500" />
              ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-xs font-medium ${
                  isConnected === null ? 'text-yellow-500' : isConnected ? 'text-emerald-500' : 'text-red-500'
              }`}>
              {isConnected === null ? 'Подключение...' : isConnected ? 'Сервер онлайн' : 'Сервер офлайн'}
            </span>
            </div>
          </div>
        </div>

        {/* Error state */}
        {state === 'error' && (
            <div className={`rounded-2xl p-6 mb-6 ${dark ? 'bg-red-900/20 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <span className="text-red-500 font-semibold">Ошибка</span>
              </div>
              <p className={`text-sm mb-4 ${dark ? 'text-red-300' : 'text-red-600'}`}>{error}</p>
              <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Попробовать снова
              </button>
            </div>
        )}

        {/* Idle State - Start Button */}
        {state === 'idle' && (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <div className="relative">
                {/* Pulse rings */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-72 h-72 rounded-full border-2 border-teal-500/10 animate-ping" style={{ animationDuration: '3s' }} />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-56 h-56 rounded-full border-2 border-teal-500/15 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-40 h-40 rounded-full border-2 border-teal-500/20 animate-ping" style={{ animationDuration: '2s', animationDelay: '1s' }} />
                </div>

                {/* Main button */}
                <button
                    onClick={handleStart}
                    disabled={!isConnected}
                    className={`
                relative z-10 group
                w-48 h-48 rounded-full
                bg-gradient-to-br from-teal-500 to-cyan-600
                shadow-2xl shadow-teal-500/30
                hover:shadow-teal-500/50 hover:scale-105
                active:scale-95
                transition-all duration-300
                flex flex-col items-center justify-center gap-3
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
              `}
                >
                  <AudioLines className="w-14 h-14 text-white group-hover:scale-110 transition-transform" />
                  <span className="text-white text-lg font-semibold tracking-wide">Начать</span>
                </button>
              </div>

              <div className="mt-12 text-center max-w-md">
                <h2 className={`text-xl font-semibold mb-3 ${dark ? 'text-white' : 'text-slate-800'}`}>
                  Начните скрининг слуха
                </h2>
                <p className={`text-sm leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Нажмите кнопку выше для запуска тестирования.
                  <strong className="block mt-2">⚠️ Обязательно наденьте наушники!</strong>
                  Звук будет подаваться поочерёдно в правое и левое ухо.
                </p>
              </div>

              {/* Info cards */}
              <div className="grid grid-cols-3 gap-4 mt-10 max-w-2xl w-full">
                {[
                  { icon: '🎧', title: 'Наушники', desc: 'Обязательно используйте наушники!' },
                  { icon: '🤫', title: 'Тишина', desc: 'Обеспечьте тихую обстановку' },
                  { icon: '🔊', title: 'Громкость', desc: 'Установите комфортную громкость' },
                ].map((card, i) => (
                    <div
                        key={i}
                        className={`
                  rounded-2xl p-5 text-center transition-all
                  ${dark
                            ? 'bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800'
                            : 'bg-white border border-slate-200 shadow-sm hover:shadow-md'
                        }
                `}
                    >
                      <div className="text-3xl mb-3">{card.icon}</div>
                      <h3 className={`text-sm font-semibold mb-1 ${dark ? 'text-white' : 'text-slate-700'}`}>{card.title}</h3>
                      <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{card.desc}</p>
                    </div>
                ))}
              </div>
            </div>
        )}

        {/* Connecting */}
        {state === 'connecting' && (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <div className={`
            w-32 h-32 rounded-full flex items-center justify-center mb-8
            ${dark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200 shadow-lg'}
          `}>
                <Loader2 className={`w-12 h-12 animate-spin ${dark ? 'text-teal-400' : 'text-teal-600'}`} />
              </div>
              <h2 className={`text-xl font-semibold mb-2 ${dark ? 'text-white' : 'text-slate-800'}`}>
                Подготовка...
              </h2>
              <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                Инициализация аудио и подключение к серверу
              </p>
            </div>
        )}

        {/* Running */}
        {state === 'running' && currentTone && (
            <div className="max-w-4xl mx-auto">
              {/* Progress bar */}
              <div className={`rounded-2xl p-6 mb-6 ${dark ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-3">
              <span className={`text-sm font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                Прогресс тестирования
              </span>
                  <span className={`text-sm font-semibold ${dark ? 'text-teal-400' : 'text-teal-600'}`}>
                Шаг {currentTone.steps_taken}
              </span>
                </div>
                <div className={`w-full h-3 rounded-full overflow-hidden ${dark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>

              {/* Current test info */}
              <div className={`rounded-2xl p-8 mb-6 text-center ${dark ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}`}>
                {/* Sound indicator */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  {isPlayingSound ? (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                        <Volume2 className="w-5 h-5 text-emerald-500 animate-pulse" />
                        <span className="text-sm font-medium text-emerald-500">Воспроизведение звука...</span>
                      </div>
                  ) : waitingForResponse ? (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30">
                        <Volume1 className="w-5 h-5 text-amber-500" />
                        <span className="text-sm font-medium text-amber-500">Слышали ли вы звук?</span>
                      </div>
                  ) : isPaused ? (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-500/20 border border-slate-500/30">
                        <VolumeX className={`w-5 h-5 ${dark ? 'text-slate-400' : 'text-slate-500'}`} />
                        <span className={`text-sm font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Пауза</span>
                      </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-center gap-3 mb-4">
              <span className={`text-xl font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>
                {currentTone.frequency} Гц
              </span>
                  <span className={`text-sm px-3 py-1.5 rounded-full font-semibold ${
                      currentTone.ear === 'left'
                          ? dark ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' : 'bg-blue-100 text-blue-700 border border-blue-200'
                          : dark ? 'bg-rose-900/30 text-rose-400 border border-rose-500/30' : 'bg-rose-100 text-rose-700 border border-rose-200'
                  }`}>
                {currentTone.ear === 'left' ? '← Левое ухо' : 'Правое ухо →'}
              </span>
                </div>

                <div className={`text-5xl font-bold mb-4 ${dark ? 'text-white' : 'text-slate-800'}`}>
                  {currentTone.db_level} дБ
                </div>

                {/* Response buttons */}
                <div className="flex items-center justify-center gap-6 mb-6">
                  <button
                      onClick={() => handleResponse(true)}
                      disabled={isPaused || isPlayingSound}
                      className="group flex flex-col items-center gap-2 px-12 py-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <CheckCircle2 className="w-10 h-10" />
                    <span className="text-lg">Слышу</span>
                  </button>

                  <button
                      onClick={() => handleResponse(false)}
                      disabled={isPaused || isPlayingSound}
                      className="group flex flex-col items-center gap-2 px-12 py-6 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white font-semibold shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <XCircle className="w-10 h-10" />
                    <span className="text-lg">Не слышу</span>
                  </button>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-3">
                  <button
                      onClick={handleReplaySound}
                      disabled={isPaused || isPlayingSound}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          dark
                              ? 'bg-teal-900/30 text-teal-400 hover:bg-teal-900/50 border border-teal-500/30'
                              : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200'
                      } disabled:opacity-50`}
                  >
                    <Volume2 className="w-4 h-4" />
                    Повторить звук
                  </button>
                  <button
                      onClick={handlePause}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          dark
                              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    {isPaused ? 'Продолжить' : 'Пауза'}
                  </button>
                  <button
                      onClick={handleReset}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          dark
                              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Сначала
                  </button>
                </div>
              </div>

              {/* Gap info */}
              {(currentTone.min_heard !== null || currentTone.max_not_heard !== null) && (
                  <div className={`rounded-2xl p-4 mb-6 ${dark ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}`}>
                    <div className="flex items-center justify-center gap-6 text-sm">
                      {currentTone.min_heard !== null && (
                          <span className={dark ? 'text-emerald-400' : 'text-emerald-600'}>
                    Мин. слышимый: <strong>{currentTone.min_heard} дБ</strong>
                  </span>
                      )}
                      {currentTone.max_not_heard !== null && (
                          <span className={dark ? 'text-red-400' : 'text-red-600'}>
                    Макс. не слышимый: <strong>{currentTone.max_not_heard} дБ</strong>
                  </span>
                      )}
                      {currentTone.gap !== null && (
                          <span className={dark ? 'text-yellow-400' : 'text-yellow-600'}>
                    Зазор: <strong>{currentTone.gap} дБ</strong>
                  </span>
                      )}
                    </div>
                  </div>
              )}

              {/* Found thresholds so far */}
              {(Object.keys(resultsRight).length > 0 || Object.keys(resultsLeft).length > 0) && (
                  <div className={`rounded-2xl p-4 ${dark ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-3 text-center ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Найденные пороги
                    </p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {FREQUENCIES.map((freq) => {
                        const freqStr = freq.toString();
                        const hasRight = resultsRight[freqStr] !== undefined;
                        const hasLeft = resultsLeft[freqStr] !== undefined;
                        const isCurrent = currentTone.frequency === freq;
                        return (
                            <div
                                key={freq}
                                className={`
                        px-3 py-2 rounded-xl text-xs font-medium transition-all
                        ${isCurrent
                                    ? dark ? 'bg-teal-900/30 text-teal-400 border border-teal-500/30 ring-2 ring-teal-500/30' : 'bg-teal-50 text-teal-700 border border-teal-200 ring-2 ring-teal-300'
                                    : hasRight && hasLeft
                                        ? dark ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : hasRight || hasLeft
                                            ? dark ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                            : dark ? 'bg-slate-800 text-slate-500 border border-slate-700' : 'bg-slate-100 text-slate-400 border border-slate-200'
                                }
                      `}
                            >
                              {freq} Гц
                              {hasRight && <span className="ml-1 text-rose-400">R:{resultsRight[freqStr]}</span>}
                              {hasLeft && <span className="ml-1 text-blue-400">L:{resultsLeft[freqStr]}</span>}
                            </div>
                        );
                      })}
                    </div>
                  </div>
              )}
            </div>
        )}

        {/* Finished */}
        {state === 'finished' && (
            <div className="max-w-4xl mx-auto">
              {/* Success header */}
              <div className={`rounded-2xl p-8 mb-6 text-center ${dark ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}`}>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/25">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <h2 className={`text-2xl font-bold mb-2 ${dark ? 'text-white' : 'text-slate-800'}`}>
                  Скрининг завершён
                </h2>
                <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Всего шагов: {currentTone?.steps_taken ?? 0}
                </p>
              </div>

              {/* Results table */}
              <div className={`rounded-2xl overflow-hidden mb-6 ${dark ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                    <tr className={dark ? 'bg-slate-800' : 'bg-slate-50'}>
                      <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Частота
                      </th>
                      <th className={`px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider ${dark ? 'text-rose-400' : 'text-rose-600'}`}>
                        Правое ухо → (дБ)
                      </th>
                      <th className={`px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider ${dark ? 'text-blue-400' : 'text-blue-600'}`}>
                        ← Левое ухо (дБ)
                      </th>
                      <th className={`px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Оценка
                      </th>
                    </tr>
                    </thead>
                    <tbody className={`divide-y ${dark ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                    {FREQUENCIES.map((freq) => {
                      const freqStr = freq.toString();
                      const thresholdR = resultsRight[freqStr];
                      const thresholdL = resultsLeft[freqStr];
                      const worstDb = Math.max(thresholdR ?? 0, thresholdL ?? 0);
                      const worstLevel = getHearingLevel(worstDb);
                      return (
                          <tr key={freq} className={`${dark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'} transition-colors`}>
                            <td className={`px-6 py-4 text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
                              {freq} Гц
                            </td>
                            <td className={`px-6 py-4 text-center text-sm font-medium ${dark ? 'text-rose-400' : 'text-rose-600'}`}>
                              {thresholdR ?? '—'}
                            </td>
                            <td className={`px-6 py-4 text-center text-sm font-medium ${dark ? 'text-blue-400' : 'text-blue-600'}`}>
                              {thresholdL ?? '—'}
                            </td>
                            <td className={`px-6 py-4 text-center text-sm font-semibold ${worstLevel.color}`}>
                              {worstLevel.label}
                            </td>
                          </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Audiogram */}
              <div className={`rounded-2xl p-6 mb-6 ${dark ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}`}>
                <h3 className={`text-lg font-semibold mb-4 ${dark ? 'text-white' : 'text-slate-800'}`}>
                  Аудиограмма
                </h3>
                <div className="flex justify-center">
                  <svg
                      viewBox={`0 0 ${AUDIOGRAM.width} ${AUDIOGRAM.height}`}
                      className="w-full max-w-2xl"
                      style={{ height: '300px' }}
                  >
                    {/* Background */}
                    <rect
                        x={AUDIOGRAM.paddingLeft}
                        y={AUDIOGRAM.paddingTop}
                        width={AUDIOGRAM.width - AUDIOGRAM.paddingLeft - AUDIOGRAM.paddingRight}
                        height={AUDIOGRAM.height - AUDIOGRAM.paddingTop - AUDIOGRAM.paddingBottom}
                        fill={dark ? '#1e293b' : '#f8fafc'}
                    />

                    {/* Horizontal grid lines (dB levels) */}
                    {[-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120].map(db => (
                        <g key={`db-${db}`}>
                          <line
                              x1={AUDIOGRAM.paddingLeft}
                              y1={getAudiogramY(db)}
                              x2={AUDIOGRAM.width - AUDIOGRAM.paddingRight}
                              y2={getAudiogramY(db)}
                              stroke={db === 25 ? (dark ? '#22c55e' : '#16a34a') : (dark ? '#334155' : '#e2e8f0')}
                              strokeWidth={db === 25 ? 2 : 1}
                              strokeDasharray={db === 25 ? '5,5' : 'none'}
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

                    {/* Vertical grid lines (frequencies) */}
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
                              fontWeight={500}
                          >
                            {freq >= 1000 ? `${freq / 1000}k` : freq}
                          </text>
                        </g>
                    ))}

                    {/* Y axis label */}
                    <text
                        x={15}
                        y={AUDIOGRAM.height / 2}
                        textAnchor="middle"
                        transform={`rotate(-90, 15, ${AUDIOGRAM.height / 2})`}
                        fill={dark ? '#64748b' : '#94a3b8'}
                        fontSize={11}
                    >
                      Уровень слуха (дБ)
                    </text>

                    {/* X axis label */}
                    <text
                        x={AUDIOGRAM.width / 2}
                        y={AUDIOGRAM.height - 5}
                        textAnchor="middle"
                        fill={dark ? '#64748b' : '#94a3b8'}
                        fontSize={11}
                    >
                      Частота (Гц)
                    </text>

                    {/* Normal hearing zone */}
                    <rect
                        x={AUDIOGRAM.paddingLeft}
                        y={AUDIOGRAM.paddingTop}
                        width={AUDIOGRAM.width - AUDIOGRAM.paddingLeft - AUDIOGRAM.paddingRight}
                        height={getAudiogramY(25) - AUDIOGRAM.paddingTop}
                        fill={dark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.08)'}
                    />

                    {/* Right ear line (red with O markers) */}
                    {Object.keys(resultsRight).length > 0 && (
                        <>
                          <polyline
                              points={FREQUENCIES
                                  .map((freq, i) => {
                                    const db = resultsRight[freq.toString()];
                                    if (db === undefined) return null;
                                    return `${getAudiogramX(i)},${getAudiogramY(db)}`;
                                  })
                                  .filter(Boolean)
                                  .join(' ')}
                              fill="none"
                              stroke="#f43f5e"
                              strokeWidth={2.5}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                          />
                          {FREQUENCIES.map((freq, i) => {
                            const db = resultsRight[freq.toString()];
                            if (db === undefined) return null;
                            return (
                                <g key={`r-${freq}`}>
                                  <circle
                                      cx={getAudiogramX(i)}
                                      cy={getAudiogramY(db)}
                                      r={8}
                                      fill="none"
                                      stroke="#f43f5e"
                                      strokeWidth={2.5}
                                  />
                                  <text
                                      x={getAudiogramX(i)}
                                      y={getAudiogramY(db) + 4}
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
                        </>
                    )}

                    {/* Left ear line (blue with X markers) */}
                    {Object.keys(resultsLeft).length > 0 && (
                        <>
                          <polyline
                              points={FREQUENCIES
                                  .map((freq, i) => {
                                    const db = resultsLeft[freq.toString()];
                                    if (db === undefined) return null;
                                    return `${getAudiogramX(i)},${getAudiogramY(db)}`;
                                  })
                                  .filter(Boolean)
                                  .join(' ')}
                              fill="none"
                              stroke="#3b82f6"
                              strokeWidth={2.5}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                          />
                          {FREQUENCIES.map((freq, i) => {
                            const db = resultsLeft[freq.toString()];
                            if (db === undefined) return null;
                            return (
                                <g key={`l-${freq}`}>
                                  <line
                                      x1={getAudiogramX(i) - 6}
                                      y1={getAudiogramY(db) - 6}
                                      x2={getAudiogramX(i) + 6}
                                      y2={getAudiogramY(db) + 6}
                                      stroke="#3b82f6"
                                      strokeWidth={2.5}
                                      strokeLinecap="round"
                                  />
                                  <line
                                      x1={getAudiogramX(i) + 6}
                                      y1={getAudiogramY(db) - 6}
                                      x2={getAudiogramX(i) - 6}
                                      y2={getAudiogramY(db) + 6}
                                      stroke="#3b82f6"
                                      strokeWidth={2.5}
                                      strokeLinecap="round"
                                  />
                                </g>
                            );
                          })}
                        </>
                    )}
                  </svg>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-8 mt-4">
                  <div className="flex items-center gap-2">
                    <svg width="24" height="16" viewBox="0 0 24 16">
                      <circle cx="12" cy="8" r="6" fill="none" stroke="#f43f5e" strokeWidth="2" />
                      <text x="12" y="11" textAnchor="middle" fill="#f43f5e" fontSize="8" fontWeight="bold">O</text>
                    </svg>
                    <span className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Правое ухо</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="24" height="16" viewBox="0 0 24 16">
                      <line x1="6" y1="2" x2="18" y2="14" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                      <line x1="18" y1="2" x2="6" y2="14" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                    <span className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Левое ухо</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-3 rounded" style={{ background: dark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.15)' }} />
                    <span className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Норма (≤25 дБ)</span>
                  </div>
                </div>
              </div>

              {/* Action button */}
              <div className="flex justify-center">
                <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:scale-105 active:scale-95 transition-all"
                >
                  <RotateCcw className="w-5 h-5" />
                  Новый скрининг
                </button>
              </div>
            </div>
        )}
      </div>
  );
}
