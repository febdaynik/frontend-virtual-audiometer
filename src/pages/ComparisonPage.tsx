import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  GitCompareArrows,
  CheckCircle2,
  XCircle,
  Minus,
  Trophy,
  Clock,
  Target,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

interface Method {
  id: string;
  name: string;
  fullName: string;
  accuracy: number;
  timeMin: number;
  adaptivity: 'high' | 'medium' | 'low' | 'none';
  falsePositive: number;
  falseNegative: number;
  automation: boolean;
  costLevel: 'low' | 'medium' | 'high';
  description: string;
  pros: string[];
  cons: string[];
}

const METHODS: Method[] = [
  {
    id: 'ann',
    name: 'ИНС (наш метод)',
    fullName: 'Адаптивный скрининг с помощью искусственной нейронной сети',
    accuracy: 94.2,
    timeMin: 5,
    adaptivity: 'high',
    falsePositive: 3.1,
    falseNegative: 2.7,
    automation: true,
    costLevel: 'low',
    description: 'Программный аудиометр с нейросетевой адаптацией порогов. ИНС в реальном времени корректирует параметры стимулов для максимально точного определения порогов слышимости.',
    pros: ['Высокая точность', 'Быстрый скрининг', 'Полная автоматизация', 'Адаптация под пациента', 'Низкая стоимость'],
    cons: ['Требует калибровки', 'Зависимость от наушников'],
  },
  {
    id: 'hughson',
    name: 'Хьюсон-Вестлейк',
    fullName: 'Модифицированный метод Хьюсона-Вестлейка',
    accuracy: 92.5,
    timeMin: 15,
    adaptivity: 'medium',
    falsePositive: 4.2,
    falseNegative: 3.3,
    automation: false,
    costLevel: 'high',
    description: 'Классический клинический метод тональной пороговой аудиометрии. Использует восходящий подход с фиксированными шагами по 5 дБ для определения порога слышимости.',
    pros: ['Стандартизован', 'Хорошо изучен', 'Высокая надёжность'],
    cons: ['Долгий процесс', 'Требует оператора', 'Дорогое оборудование'],
  },
  {
    id: 'bekesy',
    name: 'Бекеши',
    fullName: 'Аудиометрия по методу Бекеши',
    accuracy: 88.7,
    timeMin: 20,
    adaptivity: 'medium',
    falsePositive: 5.8,
    falseNegative: 5.5,
    automation: true,
    costLevel: 'high',
    description: 'Самозаписывающая аудиометрия с непрерывным изменением интенсивности тона. Пациент нажимает кнопку, пока слышит тон, что формирует трассировку порога.',
    pros: ['Самозаписывающая', 'Детализированная картина', 'Классический метод'],
    cons: ['Сложная интерпретация', 'Долго', 'Требует концентрации'],
  },
  {
    id: 'pta',
    name: 'Тональная аудиометрия',
    fullName: 'Стандартная тональная пороговая аудиометрия (PTA)',
    accuracy: 95.0,
    timeMin: 20,
    adaptivity: 'none',
    falsePositive: 2.8,
    falseNegative: 2.2,
    automation: false,
    costLevel: 'high',
    description: 'Золотой стандарт клинической аудиометрии. Проводится квалифицированным аудиологом в звукоизолированной камере с калиброванным оборудованием.',
    pros: ['Золотой стандарт', 'Максимальная точность', 'Полная диагностика'],
    cons: ['Высокая стоимость', 'Требует специалиста', 'Только в клинике'],
  },
  {
    id: 'oae',
    name: 'ОАЭ',
    fullName: 'Отоакустическая эмиссия',
    accuracy: 85.0,
    timeMin: 5,
    adaptivity: 'none',
    falsePositive: 8.0,
    falseNegative: 7.0,
    automation: true,
    costLevel: 'medium',
    description: 'Объективный метод, регистрирующий звуки, генерируемые наружными волосковыми клетками улитки. Не требует активного участия пациента.',
    pros: ['Объективный метод', 'Быстрый', 'Не требует участия пациента'],
    cons: ['Не определяет степень', 'Чувствителен к шуму', 'Ограниченная информация'],
  },
  {
    id: 'abr',
    name: 'КСВП',
    fullName: 'Коротколатентные слуховые вызванные потенциалы (ABR)',
    accuracy: 91.0,
    timeMin: 30,
    adaptivity: 'none',
    falsePositive: 4.5,
    falseNegative: 4.5,
    automation: true,
    costLevel: 'high',
    description: 'Объективный метод оценки слуха по электрическим потенциалам ствола мозга. Используется для скрининга новорождённых и диагностики ретрокохлеарной патологии.',
    pros: ['Объективный', 'Подходит для новорождённых', 'Высокая специфичность'],
    cons: ['Дорогое оборудование', 'Длительный', 'Требует седации'],
  },
];

type SortKey = 'accuracy' | 'timeMin' | 'falsePositive';

export default function ComparisonPage() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [selectedMethods, setSelectedMethods] = useState<string[]>(['ann', 'hughson', 'pta']);
  const [sortBy, setSortBy] = useState<SortKey>('accuracy');
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);

  const cardClass = `rounded-2xl p-6 ${dark ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}`;

  const toggleMethod = (id: string) => {
    setSelectedMethods(prev =>
        prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const sortedMethods = [...METHODS]
      .filter(m => selectedMethods.includes(m.id))
      .sort((a, b) => {
        if (sortBy === 'accuracy') return b.accuracy - a.accuracy;
        if (sortBy === 'timeMin') return a.timeMin - b.timeMin;
        return a.falsePositive - b.falsePositive;
      });

  const getAdaptivityLabel = (a: string) => {
    switch (a) {
      case 'high': return { text: 'Высокая', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
      case 'medium': return { text: 'Средняя', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
      case 'low': return { text: 'Низкая', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' };
      default: return { text: 'Нет', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' };
    }
  };

  const maxAccuracy = Math.max(...METHODS.map(m => m.accuracy));

  return (
      <div className="min-h-screen p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-cyan-500/20">
              <GitCompareArrows className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-800'}`}>
                Сравнение методов
              </h1>
              <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                Нейронный подход vs. классические методы скрининга слуха
              </p>
            </div>
          </div>
        </div>

        {/* Method selector */}
        <div className={`${cardClass} mb-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-base font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
              Выберите методы для сравнения
            </h3>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Сортировка:</span>
              {[
                { key: 'accuracy' as SortKey, label: 'Точность' },
                { key: 'timeMin' as SortKey, label: 'Время' },
                { key: 'falsePositive' as SortKey, label: 'Ошибки' },
              ].map(s => (
                  <button
                      key={s.key}
                      onClick={() => setSortBy(s.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          sortBy === s.key
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                              : dark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    {s.label}
                  </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {METHODS.map(m => (
                <button
                    key={m.id}
                    onClick={() => toggleMethod(m.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        selectedMethods.includes(m.id)
                            ? m.id === 'ann'
                                ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/20'
                                : dark ? 'bg-cyan-900/30 text-cyan-400 border border-cyan-500/30' : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                            : dark ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                >
                  {m.name}
                </button>
            ))}
          </div>
        </div>

        {/* Visual comparison bars */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* Accuracy chart */}
          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-4">
              <Target className={`w-4 h-4 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              <h4 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>Точность (%)</h4>
            </div>
            <div className="space-y-3">
              {sortedMethods.map(m => (
                  <div key={m.id}>
                    <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium truncate mr-2 ${dark ? 'text-slate-300' : 'text-slate-600'} ${m.id === 'ann' ? 'font-bold' : ''}`}>
                    {m.name}
                  </span>
                      <span className={`text-xs font-bold ${m.accuracy === maxAccuracy ? 'text-emerald-500' : dark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {m.accuracy}%
                  </span>
                    </div>
                    <div className={`w-full h-2.5 rounded-full overflow-hidden ${dark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                      <div
                          className={`h-full rounded-full transition-all duration-700 ${
                              m.id === 'ann'
                                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500'
                                  : 'bg-gradient-to-r from-slate-400 to-slate-500'
                          }`}
                          style={{ width: `${(m.accuracy / 100) * 100}%` }}
                      />
                    </div>
                  </div>
              ))}
            </div>
          </div>

          {/* Time chart */}
          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-4">
              <Clock className={`w-4 h-4 ${dark ? 'text-blue-400' : 'text-blue-600'}`} />
              <h4 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>Время (мин)</h4>
            </div>
            <div className="space-y-3">
              {sortedMethods.map(m => {
                const maxTime = Math.max(...sortedMethods.map(x => x.timeMin));
                return (
                    <div key={m.id}>
                      <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium truncate mr-2 ${dark ? 'text-slate-300' : 'text-slate-600'} ${m.id === 'ann' ? 'font-bold' : ''}`}>
                      {m.name}
                    </span>
                        <span className={`text-xs font-bold ${m.timeMin === Math.min(...sortedMethods.map(x => x.timeMin)) ? 'text-blue-500' : dark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {m.timeMin} мин
                    </span>
                      </div>
                      <div className={`w-full h-2.5 rounded-full overflow-hidden ${dark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${
                                m.id === 'ann'
                                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500'
                                    : 'bg-gradient-to-r from-slate-400 to-slate-500'
                            }`}
                            style={{ width: `${(m.timeMin / maxTime) * 100}%` }}
                        />
                      </div>
                    </div>
                );
              })}
            </div>
          </div>

          {/* Error rate */}
          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className={`w-4 h-4 ${dark ? 'text-amber-400' : 'text-amber-600'}`} />
              <h4 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>Ложноположит. (%)</h4>
            </div>
            <div className="space-y-3">
              {sortedMethods.map(m => {
                const maxFP = Math.max(...sortedMethods.map(x => x.falsePositive));
                return (
                    <div key={m.id}>
                      <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium truncate mr-2 ${dark ? 'text-slate-300' : 'text-slate-600'} ${m.id === 'ann' ? 'font-bold' : ''}`}>
                      {m.name}
                    </span>
                        <span className={`text-xs font-bold ${m.falsePositive === Math.min(...sortedMethods.map(x => x.falsePositive)) ? 'text-amber-500' : dark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {m.falsePositive}%
                    </span>
                      </div>
                      <div className={`w-full h-2.5 rounded-full overflow-hidden ${dark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${
                                m.id === 'ann'
                                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500'
                                    : 'bg-gradient-to-r from-slate-400 to-slate-500'
                            }`}
                            style={{ width: `${(m.falsePositive / maxFP) * 100}%` }}
                        />
                      </div>
                    </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Comparison table */}
        <div className={`${cardClass} mb-6`}>
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className={`w-5 h-5 ${dark ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <h3 className={`text-lg font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
              Сводная таблица
            </h3>
          </div>
          <div className={`rounded-xl overflow-hidden ${dark ? 'border border-slate-700/50' : 'border border-slate-200'}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                <tr className={dark ? 'bg-slate-800' : 'bg-slate-50'}>
                  <th className={`px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Метод</th>
                  <th className={`px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Точность</th>
                  <th className={`px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Время</th>
                  <th className={`px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Адаптивность</th>
                  <th className={`px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>FP / FN</th>
                  <th className={`px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Автоматизация</th>
                  <th className={`px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Стоимость</th>
                </tr>
                </thead>
                <tbody className={`divide-y ${dark ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                {sortedMethods.map((m) => {
                  const adapt = getAdaptivityLabel(m.adaptivity);
                  return (
                      <tr
                          key={m.id}
                          onClick={() => setExpandedMethod(expandedMethod === m.id ? null : m.id)}
                          className={`cursor-pointer transition-colors ${
                              m.id === 'ann'
                                  ? dark ? 'bg-teal-900/10 hover:bg-teal-900/20' : 'bg-teal-50/50 hover:bg-teal-50'
                                  : dark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'
                          }`}
                      >
                        <td className={`px-5 py-4 text-sm font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
                          <div className="flex items-center gap-2">
                            {m.id === 'ann' && <Trophy className="w-4 h-4 text-amber-500" />}
                            {m.name}
                          </div>
                        </td>
                        <td className={`px-5 py-4 text-center text-sm font-bold ${
                            m.accuracy >= 94 ? 'text-emerald-500' : m.accuracy >= 90 ? (dark ? 'text-slate-300' : 'text-slate-700') : 'text-amber-500'
                        }`}>
                          {m.accuracy}%
                        </td>
                        <td className={`px-5 py-4 text-center text-sm font-medium ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                          {m.timeMin} мин
                        </td>
                        <td className="px-5 py-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${adapt.cls} ${dark ? '' : ''}`}>
                          {adapt.text}
                        </span>
                        </td>
                        <td className={`px-5 py-4 text-center text-sm font-medium ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                          {m.falsePositive}% / {m.falseNegative}%
                        </td>
                        <td className="px-5 py-4 text-center">
                          {m.automation ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                          ) : (
                              <XCircle className={`w-5 h-5 mx-auto ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            {[1, 2, 3].map(i => (
                                <div
                                    key={i}
                                    className={`w-2.5 h-2.5 rounded-full ${
                                        i <= (m.costLevel === 'low' ? 1 : m.costLevel === 'medium' ? 2 : 3)
                                            ? 'bg-amber-500'
                                            : dark ? 'bg-slate-600' : 'bg-slate-200'
                                    }`}
                                />
                            ))}
                          </div>
                        </td>
                      </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Detail cards */}
        <div className="grid grid-cols-2 gap-6">
          {sortedMethods.map(m => (
              <div key={m.id} className={`${cardClass} ${m.id === 'ann' ? dark ? '!border-teal-500/30 ring-1 ring-teal-500/10' : '!border-teal-300 ring-1 ring-teal-100' : ''}`}>
                <div className="flex items-center gap-2 mb-3">
                  {m.id === 'ann' && <Trophy className="w-5 h-5 text-amber-500" />}
                  <h3 className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>{m.name}</h3>
                </div>
                <p className={`text-xs mb-4 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{m.fullName}</p>
                <p className={`text-sm mb-4 leading-relaxed ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{m.description}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className={`text-xs font-semibold mb-2 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>✓ Преимущества</p>
                    <ul className="space-y-1">
                      {m.pros.map((p, i) => (
                          <li key={i} className={`text-xs flex items-start gap-1.5 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                            <Minus className="w-3 h-3 mt-0.5 flex-shrink-0 text-emerald-500" />
                            {p}
                          </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className={`text-xs font-semibold mb-2 ${dark ? 'text-red-400' : 'text-red-600'}`}>✗ Недостатки</p>
                    <ul className="space-y-1">
                      {m.cons.map((c, i) => (
                          <li key={i} className={`text-xs flex items-start gap-1.5 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                            <Minus className="w-3 h-3 mt-0.5 flex-shrink-0 text-red-500" />
                            {c}
                          </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
          ))}
        </div>
      </div>
  );
}
