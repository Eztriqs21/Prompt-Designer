import { useState } from 'react';
import type { CreateWorkspacePayload } from '../../types/vibeloop';
import { Plus, X } from 'lucide-react';

interface Props {
  onSubmit: (data: CreateWorkspacePayload) => Promise<void>;
  onCancel: () => void;
}

export default function WorkspaceSetupForm({ onSubmit, onCancel }: Props) {
  const [projectName, setProjectName] = useState('');
  const [objective, setObjective] = useState('');
  const [constraints, setConstraints] = useState('');
  const [referenceNotes, setReferenceNotes] = useState('');
  const [checklist, setChecklist] = useState<{ label: string; description: string; priority: 'low' | 'medium' | 'high' }[]>([
    { label: '', description: '', priority: 'medium' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addItem = () => setChecklist([...checklist, { label: '', description: '', priority: 'medium' }]);
  const removeItem = (i: number) => setChecklist(checklist.filter((_, idx) => idx !== i));
  const updateItem = (i: number, patch: Partial<typeof checklist[0]>) => {
    const next = [...checklist];
    next[i] = { ...next[i], ...patch };
    setChecklist(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !objective.trim()) return;
    const validItems = checklist.filter((c) => c.label.trim());
    if (validItems.length === 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        projectName: projectName.trim(),
        objective: objective.trim(),
        checklist: validItems,
        constraints: constraints.split('\n').map((c) => c.trim()).filter(Boolean),
        referenceNotes: referenceNotes.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-secondary-darkSurface border border-secondary-borderGray rounded-md p-5 space-y-5">
      <h3 className="text-body font-semibold text-primary-light">Create Workspace</h3>

      <div>
        <label className="text-small text-secondary-midGray block mb-1">Project Name</label>
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="w-full bg-primary-dark border border-secondary-borderGray rounded-md px-3 py-2 text-body text-primary-light placeholder:text-secondary-midGray outline-none focus:border-accent-orange/30"
          placeholder="My Project"
          required
        />
      </div>

      <div>
        <label className="text-small text-secondary-midGray block mb-1">Objective</label>
        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          rows={3}
          className="w-full bg-primary-dark border border-secondary-borderGray rounded-md px-3 py-2 text-body text-primary-light placeholder:text-secondary-midGray resize-none outline-none focus:border-accent-orange/30"
          placeholder="What should be built..."
          required
        />
      </div>

      <div>
        <label className="text-small text-secondary-midGray block mb-2">Feature Checklist</label>
        <div className="space-y-3">
          {checklist.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <input
                value={item.label}
                onChange={(e) => updateItem(i, { label: e.target.value })}
                className="flex-1 bg-primary-dark border border-secondary-borderGray rounded-md px-3 py-1.5 text-small text-primary-light placeholder:text-secondary-midGray outline-none focus:border-accent-orange/30"
                placeholder="Feature name"
              />
              <input
                value={item.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
                className="flex-1 bg-primary-dark border border-secondary-borderGray rounded-md px-3 py-1.5 text-small text-primary-light placeholder:text-secondary-midGray outline-none focus:border-accent-orange/30"
                placeholder="Description (optional)"
              />
              <select
                value={item.priority}
                onChange={(e) => updateItem(i, { priority: e.target.value as any })}
                className="bg-primary-dark border border-secondary-borderGray rounded-md px-2 py-1.5 text-small text-secondary-midGray outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Med</option>
                <option value="high">High</option>
              </select>
              {checklist.length > 1 && (
                <button type="button" onClick={() => removeItem(i)} className="p-1.5 text-secondary-midGray hover:text-semantic-dangerRed">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={addItem} className="mt-2 flex items-center gap-1 text-small text-accent-orange hover:underline">
          <Plus className="w-3 h-3" /> Add item
        </button>
      </div>

      <div>
        <label className="text-small text-secondary-midGray block mb-1">Constraints (one per line)</label>
        <textarea
          value={constraints}
          onChange={(e) => setConstraints(e.target.value)}
          rows={2}
          className="w-full bg-primary-dark border border-secondary-borderGray rounded-md px-3 py-2 text-body text-primary-light placeholder:text-secondary-midGray resize-none outline-none focus:border-accent-orange/30"
          placeholder="e.g. Must use Tailwind CSS only"
        />
      </div>

      <div>
        <label className="text-small text-secondary-midGray block mb-1">Reference Notes</label>
        <textarea
          value={referenceNotes}
          onChange={(e) => setReferenceNotes(e.target.value)}
          rows={2}
          className="w-full bg-primary-dark border border-secondary-borderGray rounded-md px-3 py-2 text-body text-primary-light placeholder:text-secondary-midGray resize-none outline-none focus:border-accent-orange/30"
          placeholder="Any reference links, design notes, etc."
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting || !projectName.trim() || !objective.trim()}
          className="px-4 py-2 text-small font-medium rounded-md bg-accent-orange text-primary-dark hover:bg-accent-orange/90 transition-colors disabled:opacity-40"
        >
          {submitting ? 'Creating...' : 'Create Workspace'}
        </button>
        <button type="button" onClick={onCancel} className="text-small text-secondary-midGray hover:text-primary-light transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}
