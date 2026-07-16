import { useState } from 'react';
import type { ChecklistItem, Workspace } from '../../types/vibeloop';
import { Plus, X } from 'lucide-react';
import { useVibeLoopContext } from '../../context/VibeLoopContext';

interface Props {
  workspace: Workspace;
}

export default function FeatureChecklistEditor({ workspace }: Props) {
  const { updateWorkspace } = useVibeLoopContext();
  const [items, setItems] = useState(workspace.checklist);
  const [newLabel, setNewLabel] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const addItem = () => {
    if (!newLabel.trim()) return;
    const item: ChecklistItem = {
      id: `item_${Date.now()}`,
      label: newLabel.trim(),
      description: newDesc.trim(),
      priority: newPriority,
      status: 'pending',
    };
    setItems([...items, item]);
    setNewLabel('');
    setNewDesc('');
  };

  const removeItem = (id: string) => setItems(items.filter((i) => i.id !== id));

  const save = async () => {
    await updateWorkspace(workspace.id, { checklist: items });
  };

  return (
    <div className="bg-secondary-darkSurface border border-secondary-borderGray rounded-md p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-small font-semibold text-primary-light uppercase tracking-wider">Feature Checklist</h3>
        <button onClick={save} className="text-small text-accent-orange hover:underline">Save</button>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-small">
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              item.status === 'done' ? 'bg-success-green' :
              item.status === 'blocked' ? 'bg-semantic-dangerRed' :
              item.status === 'in_progress' ? 'bg-accent-orange' :
              'bg-secondary-midGray'
            }`} />
            <span className="flex-1 text-primary-light">{item.label}</span>
            <span className="text-secondary-midGray text-xs">{item.priority}</span>
            <button onClick={() => removeItem(item.id)} className="text-secondary-midGray hover:text-semantic-dangerRed">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          className="flex-1 bg-primary-dark border border-secondary-borderGray rounded-md px-3 py-1.5 text-small text-primary-light placeholder:text-secondary-midGray outline-none focus:border-accent-orange/30"
          placeholder="New feature..."
        />
        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value as any)}
          className="bg-primary-dark border border-secondary-borderGray rounded-md px-2 py-1.5 text-small text-secondary-midGray outline-none"
        >
          <option value="low">Low</option>
          <option value="medium">Med</option>
          <option value="high">High</option>
        </select>
        <button onClick={addItem} className="p-1.5 text-accent-orange hover:bg-accent-orange/10 rounded-md">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
