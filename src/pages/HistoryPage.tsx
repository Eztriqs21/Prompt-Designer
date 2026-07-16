import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, Trash2, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useChatContext } from '../context/ChatContext';
import FormattedPrompt from '../components/masterPrompt/FormattedPrompt';
import SimpleTable, { tableRowCls, tableCellCls } from '../components/ui/SimpleTable';
import Button from '../components/ui/Button';
import Chip from '../components/ui/Chip';

interface HistoryItem {
  id: string;
  chatId: string;
  title: string;
  summary: string;
  masterPrompt: string;
  timestamp: number;
  version: number;
}

interface AuditHistoryItem {
  id: string;
  title: string;
  mode: 'basic' | 'recommended' | 'full';
  timestamp: number;
  fixPrompt?: string;
}

const AUDIT_HISTORY_KEY = 'pd:auditHistory';

function readAuditHistory(): AuditHistoryItem[] {
  try {
    const raw = localStorage.getItem(AUDIT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

const MODE_LABELS: Record<AuditHistoryItem['mode'], string> = {
  basic: 'Basic',
  recommended: 'Recommended',
  full: 'Full',
};

export default function HistoryPage() {
  const navigate = useNavigate();
  const { promptVersionsByChatId, deletePromptVersion, chats } = useChatContext();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const prompts: HistoryItem[] = useMemo(() => {
    const items: HistoryItem[] = [];
    for (const chatId of Object.keys(promptVersionsByChatId)) {
      for (const v of promptVersionsByChatId[chatId]) {
        items.push({
          id: v.id,
          chatId,
          title: v.title,
          summary: v.summary,
          masterPrompt: v.masterPrompt,
          timestamp: v.createdAt,
          version: v.version,
        });
      }
    }
    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [promptVersionsByChatId]);

  const audits: AuditHistoryItem[] = useMemo(() => readAuditHistory(), []);

  const chatItems: { id: string; title: string; timestamp: number }[] = useMemo(
    () =>
      chats
        .map((c) => ({ id: c.id, title: c.title, timestamp: c.updatedAt }))
        .sort((a, b) => b.timestamp - a.timestamp),
    [chats],
  );

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (item: HistoryItem) => {
    deletePromptVersion(item.chatId, item.id);
    if (selectedId === item.id) setSelectedId(null);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const chatHeaders = ['Name / Title', 'Type', 'Date / Time', 'Status', 'Actions'];
  const chatHistoryHeaders = ['Name / Title', 'Type', 'Date / Time', 'Status', 'Actions'];
  const auditHeaders = ['Name / Title', 'Type', 'Mode', 'Date / Time', 'Status', 'Actions'];

  return (
    <div className="h-screen overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        {/* Page header */}
        <div className="mb-12">
          <h1 className="text-heading text-primary-light tracking-tight">Prompt History</h1>
          <p className="mt-2 text-small text-secondary-midGray">
            Saved chats, generated master prompts, and website audits, stored on this device.
          </p>
        </div>

        {/* Chat history section */}
        <section className="mb-12">
          <h2 className="text-subheading text-primary-light">Chat history</h2>
          <p className="text-small text-secondary-midGray mb-4">
            Conversations started in the Prompt Workspace.
          </p>

          {chatItems.length === 0 ? (
            <div className="bg-secondary-darkSurface border border-secondary-borderGray rounded-md p-8">
              <p className="text-small text-secondary-midGray mb-4">
                No chats yet. Start your first Prompt Workspace session.
              </p>
              <Button variant="primary" size="sm" onClick={() => navigate('/chat')}>
                Start first chat
              </Button>
            </div>
          ) : (
            <SimpleTable headers={chatHistoryHeaders}>
              {chatItems.map((chat, i) => (
                <motion.tr
                  key={chat.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut', delay: Math.min(i * 0.03, 0.3) }}
                  className={`${tableRowCls} hover:bg-primary-light/5`}
                >
                  <td className={tableCellCls}>
                    <span className="text-body text-primary-light">{chat.title}</span>
                  </td>
                  <td className={tableCellCls}>
                    <Chip variant="accent">Chat</Chip>
                  </td>
                  <td className={`${tableCellCls} text-small text-secondary-midGray`}>
                    {formatDate(chat.timestamp)}
                  </td>
                  <td className={tableCellCls}>
                    <Chip>Saved</Chip>
                  </td>
                  <td className={tableCellCls}>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/chat/${chat.id}`)}>
                      Open
                    </Button>
                  </td>
                </motion.tr>
              ))}
            </SimpleTable>
          )}
        </section>

        {/* Prompt versions section */}
        <section className="mb-12">
          <h2 className="text-subheading text-primary-light">Prompt versions</h2>
          <p className="text-small text-secondary-midGray mb-4">
            Master prompts generated from the Chat Workspace.
          </p>

          {prompts.length === 0 ? (
            <div className="bg-secondary-darkSurface border border-secondary-borderGray rounded-md p-8">
              <p className="text-small text-secondary-midGray mb-4">
                No prompt versions yet. Generate a master prompt to begin tracking versions.
              </p>
              <Button variant="primary" size="sm" onClick={() => navigate('/chat')}>
                Start first chat
              </Button>
            </div>
          ) : (
            <SimpleTable headers={chatHeaders}>
              {prompts.map((prompt, i) => (
                <motion.tr
                  key={prompt.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut', delay: Math.min(i * 0.03, 0.3) }}
                  className={`${tableRowCls} hover:bg-primary-light/5`}
                >
                  <td
                    className={`${tableCellCls} cursor-pointer`}
                    onClick={() => setSelectedId(selectedId === prompt.id ? null : prompt.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-body text-primary-light">{prompt.title}</span>
                      <Chip>v{prompt.version}</Chip>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-secondary-midGray transition-transform duration-200 ${
                          selectedId === prompt.id ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                    {prompt.summary && (
                      <p className="text-small text-secondary-midGray mt-1 truncate">{prompt.summary}</p>
                    )}
                  </td>
                  <td className={tableCellCls}>
                    <Chip variant="accent">Chat</Chip>
                  </td>
                  <td className={`${tableCellCls} text-small text-secondary-midGray`}>
                    {formatDate(prompt.timestamp)}
                  </td>
                  <td className={tableCellCls}>
                    <Chip>Saved</Chip>
                  </td>
                  <td className={tableCellCls}>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(prompt.masterPrompt, prompt.id)}
                      >
                        {copiedId === prompt.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-success-green" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(prompt)}>
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {prompts.map((prompt) =>
                selectedId === prompt.id ? (
                  <motion.tr
                    key={`${prompt.id}-details`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className={`${tableRowCls} hover:bg-primary-light/5`}
                  >
                    <td className={tableCellCls} colSpan={chatHeaders.length}>
                      <div className="mt-1">
                        <FormattedPrompt content={prompt.masterPrompt} />
                      </div>
                    </td>
                  </motion.tr>
                ) : null
              )}
            </SimpleTable>
          )}
        </section>

        {/* Audit history section */}
        <section>
          <h2 className="text-subheading text-primary-light">Audit history</h2>
          <p className="text-small text-secondary-midGray mb-4">
            Website audits run from the Audit Workspace, with their fix prompts.
          </p>

          {audits.length === 0 ? (
            <div className="bg-secondary-darkSurface border border-secondary-borderGray rounded-md p-8">
              <p className="text-small text-secondary-midGray mb-4">
                No audit history yet. Run a website audit to populate this list.
              </p>
              <Button variant="primary" size="sm" onClick={() => navigate('/audit')}>
                Run first audit
              </Button>
            </div>
          ) : (
            <SimpleTable headers={auditHeaders}>
              {audits.map((audit, i) => (
                <motion.tr
                  key={audit.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut', delay: Math.min(i * 0.03, 0.3) }}
                  className={`${tableRowCls} hover:bg-primary-light/5`}
                >
                  <td className={tableCellCls}>
                    <span className="text-body text-primary-light">{audit.title}</span>
                  </td>
                  <td className={tableCellCls}>
                    <Chip variant="accent">Audit</Chip>
                  </td>
                  <td className={tableCellCls}>
                    <Chip>{MODE_LABELS[audit.mode]}</Chip>
                  </td>
                  <td className={`${tableCellCls} text-small text-secondary-midGray`}>
                    {formatDate(audit.timestamp)}
                  </td>
                  <td className={tableCellCls}>
                    <Chip>Saved</Chip>
                  </td>
                  <td className={tableCellCls}>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(audit.fixPrompt ?? '', audit.id)}
                      >
                        {copiedId === audit.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-success-green" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </SimpleTable>
          )}
        </section>
      </div>
    </div>
  );
}
