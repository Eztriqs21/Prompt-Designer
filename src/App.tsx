import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import HomePage from './pages/HomePage';
import ChatWorkspace from './pages/ChatWorkspace';
import HistoryPage from './pages/HistoryPage';
import AuditPage from './pages/AuditPage';

export default function App() {
  return (
    <BrowserRouter basename="/Prompt-Designer">
      <div className="flex min-h-screen bg-surface-base text-ink-primary">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/chat" element={<ChatWorkspace />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/audit" element={<AuditPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
