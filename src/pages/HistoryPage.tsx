import { useMemo, useState } from 'react';
import { Copy, Check, Trash2, ChevronDown, FileText } from 'lucide-react';
import { useChatContext } from '../context/ChatContext';
import FormattedPrompt from '../components/masterPrompt/FormattedPrompt';

interface HistoryItem {
  id: string;
  chatId: string;
  title: string;
  summary: string;
  masterPrompt: string;
  timestamp: number;
  version: number;
}

export default function HistoryPage() {
  const { promptVersionsByChatId, deletePromptVersion } = useChatContext();
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

  return (
    <div className="h-screen overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-ink-primary tracking-tight">
            Prompt History
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Your previously generated master prompts, saved on this device.
          </p>
        </div>

        {/* Content */}
        {prompts.length === 0 ? (
          <div className="bg-surface-alt border border-border-soft rounded-md p-12 text-center">
            <FileText className="w-8 h-8 text-ink-muted/30 mx-auto mb-3" />
            <p className="text-ink-primary text-sm font-medium">No prompts yet</p>
            <p className="text-ink-muted text-xs mt-1">
              Generate your first master prompt in the Chat Workspace
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {prompts.map((prompt) => (
              <div
                key={prompt.id}
                className="bg-surface-alt border border-border-soft rounded-md overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-base transition-colors"
                  onClick={() => setSelectedId(selectedId === prompt.id ? null : prompt.id)}
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-sm font-medium text-ink-primary truncate">
                        {prompt.title}
                      </h3>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-surface-base border border-border-soft text-ink-muted shrink-0">
                        v{prompt.version}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-surface-base border border-border-soft text-ink-muted shrink-0">
                        {formatDate(prompt.timestamp)}
                      </span>
                    </div>
                    {prompt.summary && (
                      <p className="text-xs text-ink-muted truncate">{prompt.summary}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(prompt.masterPrompt, prompt.id);
                      }}
                      className="p-1.5 text-ink-muted hover:text-ink-primary hover:bg-surface-base rounded-md transition-colors"
                    >
                      {copiedId === prompt.id ? (
                        <Check className="w-3.5 h-3.5 text-accent-success" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(prompt);
                      }}
                      className="p-1.5 text-ink-muted hover:text-accent-error hover:bg-accent-error/10 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronDown
                      className={`w-4 h-4 text-ink-muted transition-transform duration-200 ${
                        selectedId === prompt.id ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>

                {selectedId === prompt.id && (
                  <div className="px-4 pb-4 border-t border-border-soft">
                    <div className="mt-3">
                      <FormattedPrompt content={prompt.masterPrompt} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
