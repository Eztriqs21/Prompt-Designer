import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ExternalLink, X } from 'lucide-react';
import { useVibeLoop } from '../hooks/useVibeLoop';
import type { CreateWorkspacePayload } from '../types/vibeloop';

function CreateWorkspaceModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { createWorkspace, loading } = useVibeLoop();
  const [form, setForm] = useState<CreateWorkspacePayload>({
    projectName: '',
    objective: '',
    checklist: [{ label: '', description: '', priority: 'high' }],
    constraints: [],
    referenceNotes: '',
  });
  const [error, setError] = useState<string | null>(null);

  const addItem = () => {
    setForm((f) => ({
      ...f,
      checklist: [...f.checklist, { label: '', description: '', priority: 'high' }],
    }));
  };

  const removeItem = (idx: number) => {
    setForm((f) => ({
      ...f,
      checklist: f.checklist.filter((_, i) => i !== idx),
    }));
  };

  const updateItem = (idx: number, patch: Partial<{ label: string; description: string; priority: 'critical' | 'high' | 'medium' | 'low' }>) => {
    setForm((f) => ({
      ...f,
      checklist: f.checklist.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.projectName.trim() || !form.objective.trim()) {
      setError('Project name and objective are required');
      return;
    }
    const validItems = form.checklist.filter((item) => item.label.trim());
    if (validItems.length === 0) {
      setError('Add at least one checklist item');
      return;
    }
    try {
      const ws = await createWorkspace({ ...form, checklist: validItems });
      onCreated(ws.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-dark/80">
      <div className="w-full max-w-xl bg-secondary-darkSurface border border-secondary-borderGray rounded-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-primary-light">New Workspace</h2>
          <button onClick={onClose} className="p-1 text-secondary-midGray hover:text-primary-light">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-semantic-dangerRed/10 border border-semantic-dangerRed/30 rounded text-sm text-semantic-dangerRed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-midGray mb-1">Project Name</label>
            <input
              type="text"
              value={form.projectName}
              onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))}
              className="w-full px-3 py-2 bg-primary-dark border border-secondary-borderGray rounded text-primary-light text-sm focus:border-accent-orange focus:outline-none"
              placeholder="My Project"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-midGray mb-1">Objective</label>
            <textarea
              value={form.objective}
              onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))}
              className="w-full px-3 py-2 bg-primary-dark border border-secondary-borderGray rounded text-primary-light text-sm focus:border-accent-orange focus:outline-none"
              rows={3}
              placeholder="What should be built..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-secondary-midGray">Feature Checklist</label>
              <button type="button" onClick={addItem} className="text-xs text-accent-orange hover:text-accent-orange/80">
                + Add item
              </button>
            </div>
            <div className="space-y-2">
              {form.checklist.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => updateItem(idx, { label: e.target.value })}
                    className="flex-1 px-3 py-2 bg-primary-dark border border-secondary-borderGray rounded text-primary-light text-sm focus:border-accent-orange focus:outline-none"
                    placeholder="Feature label"
                  />
                  <select
                    value={item.priority}
                    onChange={(e) => updateItem(idx, { priority: e.target.value as any })}
                    className="px-2 py-2 bg-primary-dark border border-secondary-borderGray rounded text-primary-light text-sm focus:border-accent-orange focus:outline-none"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  {form.checklist.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="p-2 text-secondary-midGray hover:text-semantic-dangerRed">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-midGray mb-1">Constraints (optional)</label>
            <input
              type="text"
              value={form.constraints?.join(', ') || ''}
              onChange={(e) => setForm((f) => ({ ...f, constraints: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))}
              className="w-full px-3 py-2 bg-primary-dark border border-secondary-borderGray rounded text-primary-light text-sm focus:border-accent-orange focus:outline-none"
              placeholder="e.g. Use Firebase Auth, No external UI libraries"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-midGray mb-1">Reference Notes (optional)</label>
            <textarea
              value={form.referenceNotes || ''}
              onChange={(e) => setForm((f) => ({ ...f, referenceNotes: e.target.value }))}
              className="w-full px-3 py-2 bg-primary-dark border border-secondary-borderGray rounded text-primary-light text-sm focus:border-accent-orange focus:outline-none"
              rows={2}
              placeholder="Links to designs, docs, etc."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-secondary-midGray hover:text-primary-light transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium bg-accent-orange text-primary-dark rounded hover:bg-accent-orange/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VibeLoopPage() {
  const { workspaces, loading, error, loadWorkspaces, deleteWorkspace } = useVibeLoop();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const handleSelect = (id: string) => {
    navigate(`/vibeloop/${id}`);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this workspace?')) {
      await deleteWorkspace(id);
    }
  };

  return (
    <div className="min-h-screen bg-primary-dark p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-primary-light">VibeLoop</h1>
            <p className="text-secondary-midGray mt-1">
              Server-orchestrated automation loop for AI-driven development
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent-orange text-primary-dark rounded-md font-medium hover:bg-accent-orange/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Workspace
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-semantic-dangerRed/10 border border-semantic-dangerRed/30 rounded-md text-semantic-dangerRed">
            {error}
          </div>
        )}

        {loading && workspaces.length === 0 ? (
          <div className="text-center py-12 text-secondary-midGray">Loading...</div>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-secondary-midGray mb-4">No workspaces yet</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-accent-orange hover:text-accent-orange/80 transition-colors"
            >
              Create your first workspace
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                onClick={() => handleSelect(workspace.id)}
                className="p-4 bg-secondary-darkSurface border border-secondary-borderGray rounded-lg cursor-pointer hover:border-accent-orange/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-primary-light truncate">
                      {workspace.projectName}
                    </h3>
                    <p className="text-sm text-secondary-midGray mt-1 line-clamp-2">
                      {workspace.objective}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-secondary-midGray">
                      <span>{workspace.checklist.length} items</span>
                      <span>Created {new Date(workspace.createdAt).toLocaleDateString()}</span>
                      <span
                        className={`px-2 py-0.5 rounded ${
                          workspace.status === 'active'
                            ? 'bg-success-green/20 text-success-green'
                            : workspace.status === 'revoked'
                            ? 'bg-semantic-dangerRed/20 text-semantic-dangerRed'
                            : 'bg-secondary-midGray/20 text-secondary-midGray'
                        }`}
                      >
                        {workspace.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={(e) => handleDelete(workspace.id, e)}
                      className="p-2 text-secondary-midGray hover:text-semantic-dangerRed transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ExternalLink className="w-4 h-4 text-secondary-midGray" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateWorkspaceModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            navigate(`/vibeloop/${id}`);
          }}
        />
      )}
    </div>
  );
}
