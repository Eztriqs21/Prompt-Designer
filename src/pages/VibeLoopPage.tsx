import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { useVibeLoop } from '../hooks/useVibeLoop';

export default function VibeLoopPage() {
  const { workspaces, loading, error, loadWorkspaces, deleteWorkspace } = useVibeLoop();
  const navigate = useNavigate();

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const handleCreate = () => {
    navigate('/vibeloop/new');
  };

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
            onClick={handleCreate}
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
              onClick={handleCreate}
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
    </div>
  );
}
