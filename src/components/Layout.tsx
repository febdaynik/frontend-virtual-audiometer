import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useTheme } from '../context/ThemeContext';
import { useSidebar } from '../context/SidebarContext';

export default function Layout() {
  const { theme } = useTheme();
  const { collapsed } = useSidebar();

  return (
      <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <Sidebar />
        <main
            className="min-h-screen transition-all duration-300"
            style={{ marginLeft: collapsed ? 80 : 288 }}
        >
          <Outlet />
        </main>
      </div>
  );
}
