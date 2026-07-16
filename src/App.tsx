import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';
import Sidebar from './components/layout/Sidebar';
import HomePage from './pages/HomePage';
import HeroLandingPage from './pages/HeroLandingPage';
import ChatWorkspace from './pages/ChatWorkspace';
import HistoryPage from './pages/HistoryPage';
import AuditPage from './pages/AuditPage';
import { ChatProvider } from './context/ChatContext';
import { ToastProvider } from './components/ui/Toast';
import CommandPalette from './components/layout/CommandPalette';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <Routes location={location}>
        <Route path="/" element={<HeroLandingPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/chat/*" element={<ChatWorkspace />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/audit" element={<AuditPage />} />
      </Routes>
    </motion.div>
  );
}

function AppLayout() {
  const location = useLocation();
  const showSidebar = location.pathname !== '/';
  return (
    <div className="flex w-full min-h-screen bg-primary-dark text-primary-light">
      {showSidebar && <Sidebar />}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <AnimatedRoutes />
      </main>
      <CommandPalette />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/Prompt-Designer">
      <MotionConfig reducedMotion="user">
        <ChatProvider>
          <ToastProvider>
            <AppLayout />
          </ToastProvider>
        </ChatProvider>
      </MotionConfig>
    </BrowserRouter>
  );
}
