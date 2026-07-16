import type { AgentResponse } from '../../types/vibeloop';
import { FileText, Terminal, AlertTriangle, Wrench } from 'lucide-react';

interface Props {
  response: AgentResponse | null;
}

export default function AgentResponseViewer({ response }: Props) {
  if (!response) {
    return <p className="text-small text-secondary-midGray py-4">No agent response yet</p>;
  }

  return (
    <div className="space-y-4">
      <h4 className="text-small font-semibold text-primary-light uppercase tracking-wider">Agent Response</h4>

      {/* Message */}
      <div className="bg-primary-dark border border-secondary-borderGray rounded-md p-4">
        <pre className="text-small text-secondary-midGray whitespace-pre-wrap leading-relaxed">
          {response.message}
        </pre>
      </div>

      {/* Diff Summary */}
      {response.diffSummary && (
        <div>
          <h5 className="text-xs font-medium text-secondary-midGray uppercase mb-1">Diff Summary</h5>
          <div className="bg-primary-dark border border-secondary-borderGray rounded-md p-3">
            <pre className="text-xs text-secondary-midGray whitespace-pre-wrap">{response.diffSummary}</pre>
          </div>
        </div>
      )}

      {/* Files Touched */}
      {response.filesTouched.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-secondary-midGray uppercase mb-1 flex items-center gap-1">
            <FileText className="w-3 h-3" /> Files Touched
          </h5>
          <div className="flex flex-wrap gap-1.5">
            {response.filesTouched.map((f, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded bg-secondary-darkSurface border border-secondary-borderGray text-secondary-midGray">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Commands Run */}
      {response.commandsRun.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-secondary-midGray uppercase mb-1 flex items-center gap-1">
            <Terminal className="w-3 h-3" /> Commands Run
          </h5>
          <div className="bg-primary-dark border border-secondary-borderGray rounded-md p-3">
            {response.commandsRun.map((cmd, i) => (
              <code key={i} className="text-xs text-accent-orange block">{cmd}</code>
            ))}
          </div>
        </div>
      )}

      {/* Errors */}
      {response.errorsFound.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-semantic-dangerRed uppercase mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Errors Found
          </h5>
          <div className="space-y-1">
            {response.errorsFound.map((err, i) => (
              <p key={i} className="text-xs text-semantic-dangerRed bg-semantic-dangerRed/5 border border-semantic-dangerRed/10 rounded px-2 py-1">
                {err}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Fixes */}
      {response.suggestedFixes.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-accent-orange uppercase mb-1 flex items-center gap-1">
            <Wrench className="w-3 h-3" /> Suggested Fixes
          </h5>
          <div className="space-y-1">
            {response.suggestedFixes.map((fix, i) => (
              <p key={i} className="text-xs text-accent-orange bg-accent-orange/5 border border-accent-orange/10 rounded px-2 py-1">
                {fix}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
