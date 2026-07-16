import { useState } from 'react';
import { Copy, Check, RotateCcw } from 'lucide-react';
import type { Workspace } from '../../types/vibeloop';
import { useVibeLoopContext } from '../../context/VibeLoopContext';

interface Props {
  workspace: Workspace;
}

export default function WorkspaceKeyCard({ workspace }: Props) {
  const { revokeKey } = useVibeLoopContext();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(workspace.key);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = workspace.key;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isRevoked = !!workspace.revokedAt;

  return (
    <div className="bg-secondary-darkSurface border border-secondary-borderGray rounded-md p-4 space-y-3">
      <h3 className="text-small font-semibold text-primary-light uppercase tracking-wider">Workspace Key</h3>

      <div className="flex items-center gap-2">
        <code className={`flex-1 text-small px-3 py-2 rounded-md border ${
          isRevoked
            ? 'bg-primary-dark/50 border-semantic-dangerRed/20 text-secondary-midGray line-through'
            : 'bg-primary-dark border-secondary-borderGray text-accent-orange'
        }`}>
          {workspace.key}
        </code>
        <button
          onClick={handleCopy}
          disabled={isRevoked}
          className="p-2 rounded-md bg-primary-dark border border-secondary-borderGray text-secondary-midGray hover:text-accent-orange transition-colors disabled:opacity-30"
        >
          {copied ? <Check className="w-4 h-4 text-success-green" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {isRevoked ? (
        <p className="text-small text-semantic-dangerRed">Key has been revoked</p>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-small text-secondary-midGray">
            Paste this key in OpenCode to connect
          </p>
          <button
            onClick={() => revokeKey(workspace.id)}
            className="flex items-center gap-1 text-small text-secondary-midGray hover:text-semantic-dangerRed transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Revoke
          </button>
        </div>
      )}
    </div>
  );
}
