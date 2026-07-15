import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import PageShell from './components/layout/PageShell';
import HomePage from './pages/HomePage';
import HistoryPage from './pages/HistoryPage';
import bgVideo from './assets/BG Video.mp4';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/history" element={<HistoryPage />} />
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
          className="fixed inset-0 w-full h-full object-cover pointer-events-none z-0"
          style={{ opacity: 0.3, filter: 'grayscale(100%) brightness(0.7)' }}
        >
          <source src={bgVideo} type="video/mp4" />
        </video>

        {/* App content */}
        <div className="relative z-10">
          <PageShell>
            <AnimatedRoutes />
          </PageShell>
        </div>
      </div>
    </BrowserRouter>
  );
}
