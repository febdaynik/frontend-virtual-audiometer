import { HashRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider } from './context/SidebarContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import TestingPage from './pages/TestingPage';
import ComparisonTestPage from './pages/ComparisonTestPage';
import NetworkInfoPage from './pages/NetworkInfoPage';
import ComparisonPage from './pages/ComparisonPage';

export default function App() {
  return (
      <ThemeProvider>
        <SidebarProvider>
          <HashRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/testing" element={<TestingPage />} />
                <Route path="/comparison-test" element={<ComparisonTestPage />} />
                <Route path="/network-info" element={<NetworkInfoPage />} />
                <Route path="/comparison" element={<ComparisonPage />} />
              </Route>
            </Routes>
          </HashRouter>
        </SidebarProvider>
      </ThemeProvider>
  );
}
