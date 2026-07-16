import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';
import { useEffect, useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import HomePage from './pages/HomePage';
import HeroLandingPage from './pages/HeroLandingPage';
import ChatWorkspace from './pages/ChatWorkspace';
import HistoryPage from './pages/HistoryPage';
import AuditPage from './pages/AuditPage';
import { ChatProvider } from './context/ChatContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/ui/Toast';
import CommandPalette from './components/layout/CommandPalette';
import LoginDialog from './components/auth/LoginDialog';

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

function AuthSplash() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-primary-dark">
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="text-lg font-bold tracking-tight text-accent-orange"
      >
        Prompt Designer
      </motion.span>
    </div>
  );
}

function AppLayout() {
  const location = useLocation();
  const { authReady } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ open?: boolean }>).detail;
      if (detail?.open) setLoginOpen(true);
    };
    window.addEventListener('pd:login-dialog', handler as EventListener);
    return () => window.removeEventListener('pd:login-dialog', handler as EventListener);
  }, []);

  if (!authReady) {
    return <AuthSplash />;
  }

  const showSidebar = location.pathname !== '/';

  return (
    <div className="flex w-full min-h-screen bg-primary-dark text-primary-light">
      {showSidebar && <Sidebar />}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <AnimatedRoutes />
      </main>
      <CommandPalette />
      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/Prompt-Designer">
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <ChatProvider>
            <ToastProvider>
              <AppLayout />
            </ToastProvider>
          </ChatProvider>
        </AuthProvider>
      </MotionConfig>
    </BrowserRouter>
  );
}
