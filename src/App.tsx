import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import PageShell from './components/layout/PageShell';
import HomePage from './pages/HomePage';
import HistoryPage from './pages/HistoryPage';
import AuditPage from './pages/AuditPage';
import bgVideo from './assets/BG Video.mp4';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/audit" element={<AuditPage />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/Prompt-Designer">
      <div className="relative min-h-screen bg-[#05050A] text-white overflow-x-hidden">
        {/* Background video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="fixed inset-0 w-full h-full object-cover pointer-events-none"
          style={{ opacity: 0.45, filter: 'brightness(0.55) saturate(0.7)', zIndex: 0 }}
        >
          <source src={bgVideo} type="video/mp4" />
        </video>
        {/* Dark overlay to ensure text readability */}
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1, background: 'linear-gradient(180deg, rgba(5,5,10,0.6) 0%, rgba(5,5,10,0.85) 100%)' }} />

        {/* App content */}
        <div className="relative" style={{ zIndex: 2 }}>
          <PageShell>
            <AnimatedRoutes />
          </PageShell>
        </div>
      </div>
    </BrowserRouter>
  );
}
