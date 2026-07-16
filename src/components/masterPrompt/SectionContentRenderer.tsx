import { useMemo } from 'react';
import FormattedPrompt from './FormattedPrompt';

interface StructuredContent {
  summary?: string;
  analysis?: string;
  masterPrompt?: string;
}

function tryParseStructured(raw: string): StructuredContent | null {
  // Try JSON first
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && (parsed.summary || parsed.analysis || parsed.masterPrompt)) {
        return parsed;
      }
    } catch { /* not JSON */ }
  }

  // Try labeled plain text: "Summary: ...\n\nAnalysis: ...\n\nMaster Prompt: ..."
  const summaryMatch = raw.match(/Summary:\s*([\s\S]*?)(?=\nAnalysis:|\nMaster Prompt:|$)/i);
  const analysisMatch = raw.match(/Analysis:\s*([\s\S]*?)(?=\nMaster Prompt:|\nSummary:|$)/i);
  const masterMatch = raw.match(/Master Prompt:\s*([\s\S]*?)$/i);

  const summary = summaryMatch?.[1]?.trim();
  const analysis = analysisMatch?.[1]?.trim();
  const masterPrompt = masterMatch?.[1]?.trim();

  if (summary || analysis || masterPrompt) {
    return { summary, analysis, masterPrompt };
  }

  return null;
}

interface SectionContentRendererProps {
  content: string;
}

export default function SectionContentRenderer({ content }: SectionContentRendererProps) {
  const structured = useMemo(() => tryParseStructured(content), [content]);

  if (!structured) {
    // Unstructured text — render with FormattedPrompt
    return <FormattedPrompt content={content} />;
  }

  const { summary, analysis, masterPrompt } = structured;

  return (
    <div className="space-y-4">
      {summary && (
        <div>
          <h4 className="text-small font-semibold text-accent-purple uppercase tracking-wider mb-1.5">
            Summary
          </h4>
          <p className="text-body text-primary-light leading-relaxed">{summary}</p>
        </div>
      )}

      {analysis && (
        <div>
          <h4 className="text-small font-semibold text-accent-purple uppercase tracking-wider mb-1.5">
            Analysis
          </h4>
          <p className="text-body text-primary-light leading-relaxed">{analysis}</p>
        </div>
      )}

      {masterPrompt && (
        <div>
          <h4 className="text-small font-semibold text-accent-purple uppercase tracking-wider mb-1.5">
            Master Prompt
          </h4>
          <FormattedPrompt content={masterPrompt} />
        </div>
      )}
    </div>
  );
}
