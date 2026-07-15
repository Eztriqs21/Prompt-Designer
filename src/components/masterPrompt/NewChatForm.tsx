import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import CustomSelect from '../ui/CustomSelect';

const WEBSITE_TYPES = ['SaaS', 'Portfolio', 'Agency', 'Landing Page', 'E-commerce', 'Custom'];
const STYLE_VIBES = ['Minimal', 'Cinematic', 'Playful', 'Bold', 'Elegant', 'Dark & Sleek', 'Colorful'];

interface NewChatFormProps {
  onSubmit: (values: FormValues) => void | Promise<void>;
  onCancel: () => void;
}

export interface FormValues {
  title: string;
  websiteType: string;
  audience: string;
  goal: string;
  preferredStack: string;
  style: string;
}

export default function NewChatForm({ onSubmit, onCancel }: NewChatFormProps) {
  const [values, setValues] = useState<FormValues>({
    title: '',
    websiteType: 'SaaS',
    audience: '',
    goal: '',
    preferredStack: '',
    style: 'Minimal',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        ...values,
        title: values.title || `${values.websiteType} ÔÇö ${new Date().toLocaleDateString()}`,
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to create chat. Is the server running?');
    } finally {
      setSubmitting(false);
    }
  };

  const update = (field: keyof FormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface-alt border border-border-soft rounded-md p-5 space-y-4 max-w-2xl w-full"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-primary" />
          New Chat
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-ink-muted hover:text-ink-primary transition-colors"
        >
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5">
            Website Type
          </label>
          <CustomSelect
            value={values.websiteType}
            options={WEBSITE_TYPES.map((t) => ({ value: t, label: t }))}
            onChange={(val) => update('websiteType', val)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5">
            Chat Title
          </label>
          <input
            type="text"
            value={values.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder={`${values.websiteType} project`}
            className="w-full bg-surface-base border border-border-soft rounded-md px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent-primary/30 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5">
            Target Audience
          </label>
          <input
            type="text"
            value={values.audience}
            onChange={(e) => update('audience', e.target.value)}
            placeholder="e.g., small business owners, developers"
            className="w-full bg-surface-base border border-border-soft rounded-md px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent-primary/30 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5">
            Primary Goal
          </label>
          <input
            type="text"
            value={values.goal}
            onChange={(e) => update('goal', e.target.value)}
            placeholder="e.g., signups, sales, portfolio showcase"
            className="w-full bg-surface-base border border-border-soft rounded-md px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent-primary/30 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5">
            Preferred Stack
            <span className="text-ink-muted/60 ml-1 normal-case">(optional)</span>
          </label>
          <input
            type="text"
            value={values.preferredStack}
            onChange={(e) => update('preferredStack', e.target.value)}
            placeholder="e.g., Next.js, Vue, Svelte"
            className="w-full bg-surface-base border border-border-soft rounded-md px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent-primary/30 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5">
            Style / Vibe
          </label>
          <CustomSelect
            value={values.style}
            options={STYLE_VIBES.map((s) => ({ value: s, label: s }))}
            onChange={(val) => update('style', val)}
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-accent-error bg-accent-error/10 border border-accent-error/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-medium text-ink-muted hover:text-ink-primary transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2 text-xs font-medium rounded-md bg-accent-primary text-surface-base hover:bg-accent-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {submitting ? 'Creating...' : 'Create Chat'}
        </button>
      </div>
    </form>
  );
}
