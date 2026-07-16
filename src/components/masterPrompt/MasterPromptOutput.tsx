import { useState, useRef } from 'react';
import { Copy, Check, Bot, ArrowLeft } from 'lucide-react';
import FormattedPrompt from './FormattedPrompt';
import SectionCard from './SectionCard';
import SectionConversation from './SectionConversation';
import type { SectionType, SectionState } from '../../types';
import type { SectionMessage } from '../../lib/apiClient';

interface MasterPromptOutputProps {
  summary: string | null;
  analysis: string | null;
  masterPrompt: string | null;
  generatedBy?: string | null;
  sections: Record<SectionType, SectionState>;
  sectionMessages: Record<SectionType, SectionMessage[]>;
  activeSection: SectionType | null;
  onSelectSection: (type: SectionType | null) => void;
  onGenerateSection: (type: SectionType, userRequest?: string) => void;
  chatId: string | null;
  onLoadSectionMessages: (chatId: string, sectionType: SectionType) => Promise<void>;
}

export default function MasterPromptOutput({
  summary,
  analysis,
  masterPrompt,
  generatedBy,
  sections,
  sectionMessages,
  activeSection,
  onSelectSection,
  onGenerateSection,
  chatId,
  onLoadSectionMessages,
}: MasterPromptOutputProps) {
  const [copied, setCopied] = useState(false);
  const renderedRef = useRef(false);
  if (!renderedRef.current && masterPrompt) {
    renderedRef.current = true;
    console.log(
      `${new Date().toISOString()} | [fe:ui] MasterPromptOutput-displayed | generatedBy=${generatedBy} masterPromptLen=${masterPrompt.length}`,
    );
  }

  const handleCopy = async () => {
    if (!masterPrompt) return;
    try {
      await navigator.clipboard.writeText(masterPrompt);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = masterPrompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!masterPrompt) return null;

  if (activeSection) {
    return (
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-md bg-surface-alt border border-border-soft flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-ink-muted" />
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <button
            onClick={() => onSelectSection(null)}
            className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sections
          </button>

          <SectionConversation
            sectionType={activeSection}
            state={sections[activeSection]}
            messages={sectionMessages[activeSection]}
            onGenerate={(request) => onGenerateSection(activeSection, request)}
            onLoadMessages={() => chatId ? onLoadSectionMessages(chatId, activeSection) : Promise.resolve()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-md bg-surface-alt border border-border-soft flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-3.5 h-3.5 text-ink-muted" />
      </div>

      <div className="flex-1 min-w-0 space-y-4">
        {summary && (
          <div className="p-4 rounded-md bg-surface-alt border border-border-soft">
            <p className="text-xs font-semibold tracking-wider uppercase text-ink-muted mb-1.5">Summary</p>
            <p className="text-sm text-ink-primary leading-relaxed">{summary}</p>
          </div>
        )}

        {analysis && (
          <div className="p-4 rounded-md bg-surface-alt border border-border-soft">
            <p className="text-xs font-semibold tracking-wider uppercase text-ink-muted mb-1.5">Analysis</p>
            <p className="text-sm text-ink-primary leading-relaxed">{analysis}</p>
          </div>
        )}

        <FormattedPrompt content={masterPrompt} />

        <div className="flex justify-end">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-surface-alt border border-border-soft text-ink-muted hover:text-ink-primary transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy Prompt
              </>
            )}
          </button>
        </div>

          <div className="space-y-4">
            <div className="text-center py-3">
              <h3 className="text-lg font-semibold text-ink-primary mb-1">
                Your master prompt is ready
              </h3>
              <p className="text-xs text-ink-muted">
                Choose a section to dive deeper
              </p>
              {generatedBy && (
                <p className="text-[11px] text-ink-muted/70 mt-1">
                  Generated by {generatedBy}
                </p>
              )}
            </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border-soft" />
            <span className="text-xs font-medium text-ink-muted tracking-wider uppercase">
              Sections
            </span>
            <div className="flex-1 h-px bg-border-soft" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(['coding', 'ui-ux', 'audit'] as SectionType[]).map((type) => (
              <SectionCard
                key={type}
                type={type}
                state={sections[type]}
                isActive={false}
                onClick={() => onSelectSection(type)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
