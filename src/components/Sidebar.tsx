import { NavLink } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useSidebar } from '../context/SidebarContext';
import {
  Home,
  Activity,
  BrainCircuit,
  GitCompareArrows,
  FlaskConical,
  Sun,
  Moon,
  AudioLines,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Главная', description: 'Запуск скрининга' },
  { to: '/testing', icon: Activity, label: 'Виртуальный тест', description: 'Тест на виртуальном пациенте' },
  { to: '/comparison-test', icon: FlaskConical, label: 'Сравнение методов', description: 'Сравнительное тестирование' },
  { to: '/network-info', icon: BrainCircuit, label: 'О нейросети', description: 'Архитектура ИНС' },
  { to: '/comparison', icon: GitCompareArrows, label: 'Обзор методов', description: 'Теоретическое сравнение' },
];

export default function Sidebar() {
  const { theme, toggleTheme } = useTheme();
  const { collapsed, toggleCollapsed } = useSidebar();

  return (
      <aside
          className={`
        fixed left-0 top-0 z-40 h-screen flex flex-col
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-20' : 'w-72'}
        ${theme === 'dark'
              ? 'bg-slate-900 border-r border-slate-700/50'
              : 'bg-white border-r border-slate-200 shadow-lg shadow-slate-100/50'
          }
      `}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-5 py-6 ${collapsed ? 'justify-center px-3' : ''}`}>
          <div className="flex items-center justify-center rounded-xl w-11 h-11 bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/25 flex-shrink-0">
            <AudioLines className="w-6 h-6 text-white" />
          </div>
          {!collapsed && (
              <div className="overflow-hidden">
                <h1 className={`text-base font-bold leading-tight tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                  Аудиометр
                </h1>
                <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Скрининг с ИНС
                </p>
              </div>
          )}
        </div>

        {/* Divider */}
        <div className={`mx-4 h-px ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'}`} />

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {!collapsed && (
              <p className={`px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Навигация
              </p>
          )}
          {navItems.map((item) => (
              <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200
              ${collapsed ? 'justify-center px-2' : ''}
              ${isActive
                          ? theme === 'dark'
                              ? 'bg-teal-500/15 text-teal-400 shadow-sm'
                              : 'bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-700 shadow-sm shadow-teal-100/50'
                          : theme === 'dark'
                              ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                  }
              >
                {({ isActive }) => (
                    <>
                      <div className={`
                  flex items-center justify-center rounded-lg w-9 h-9 flex-shrink-0 transition-all
                  ${isActive
                          ? theme === 'dark'
                              ? 'bg-teal-500/20 text-teal-400'
                              : 'bg-teal-100 text-teal-600'
                          : theme === 'dark'
                              ? 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-300'
                              : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                      }
                `}>
                        <item.icon className="w-[18px] h-[18px]" />
                      </div>
                      {!collapsed && (
                          <div className="overflow-hidden">
                            <span className="text-sm font-medium block leading-tight">{item.label}</span>
                            <span className={`text-[11px] ${
                                isActive
                                    ? theme === 'dark' ? 'text-teal-400/60' : 'text-teal-600/60'
                                    : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                            }`}>
                      {item.description}
                    </span>
                          </div>
                      )}
                    </>
                )}
              </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className={`px-3 py-4 space-y-2 border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-100'}`}>
          {/* Theme toggle */}
          <button
              onClick={toggleTheme}
              className={`
            w-full flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200
            ${collapsed ? 'justify-center px-2' : ''}
            ${theme === 'dark'
                  ? 'text-slate-400 hover:bg-slate-800 hover:text-amber-400'
                  : 'text-slate-600 hover:bg-amber-50 hover:text-amber-600'
              }
          `}
          >
            <div className={`flex items-center justify-center rounded-lg w-9 h-9 flex-shrink-0
            ${theme === 'dark' ? 'bg-slate-800 text-amber-400' : 'bg-slate-100 text-amber-500'}
          `}>
              {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </div>
            {!collapsed && (
                <span className="text-sm font-medium">
              {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            </span>
            )}
          </button>

          {/* Collapse toggle */}
          <button
              onClick={toggleCollapsed}
              className={`
            w-full flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200
            ${collapsed ? 'justify-center px-2' : ''}
            ${theme === 'dark'
                  ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }
          `}
          >
            <div className={`flex items-center justify-center rounded-lg w-9 h-9 flex-shrink-0
            ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}
          `}>
              {collapsed ? <ChevronRight className="w-[18px] h-[18px]" /> : <ChevronLeft className="w-[18px] h-[18px]" />}
            </div>
            {!collapsed && <span className="text-sm font-medium">Свернуть</span>}
          </button>
        </div>
      </aside>
  );
}
