import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import HomePage from './pages/HomePage';
import ChatWorkspace from './pages/ChatWorkspace';
import HistoryPage from './pages/HistoryPage';
import AuditPage from './pages/AuditPage';
import { ChatProvider } from './context/ChatContext';
import { ToastProvider } from './components/ui/Toast';
import CommandPalette from './components/layout/CommandPalette';

export default function App() {
  return (
    <BrowserRouter basename="/Prompt-Designer">
      <ChatProvider>
        <ToastProvider>
          <div className="flex w-full min-h-screen bg-primary-dark text-primary-light">
            <Sidebar />
            <main className="flex-1 min-w-0 overflow-x-hidden">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/chat/*" element={<ChatWorkspace />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/audit" element={<AuditPage />} />
              </Routes>
            </main>
          <CommandPalette />
          </div>
        </ToastProvider>
      </ChatProvider>
    </BrowserRouter>
  );
}
