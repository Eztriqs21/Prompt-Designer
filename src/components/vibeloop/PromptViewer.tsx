import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface Props {
  prompt: string;
}

export default function PromptViewer({ prompt }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!prompt) {
    return <p className="text-small text-secondary-midGray py-4">No prompt generated yet</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-small font-semibold text-primary-light uppercase tracking-wider">Latest Prompt</h4>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-small text-secondary-midGray hover:text-accent-orange transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-success-green" /> : <Copy className="w-3 h-3" />}
          Copy
        </button>
      </div>
      <div className="bg-primary-dark border border-secondary-borderGray rounded-md p-4 max-h-64 overflow-y-auto">
        <pre className="text-small text-secondary-midGray whitespace-pre-wrap font-mono leading-relaxed">
          {prompt}
        </pre>
      </div>
    </div>
  );
}
