import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowRight, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useVibeLoopContext } from '../context/VibeLoopContext';
import WorkspaceSetupForm from '../components/vibeloop/WorkspaceSetupForm';
import FadeIn from '../components/ui/FadeIn';

export default function VibeLoopPage() {
  const { workspaces, loading, createWorkspace, deleteWorkspace } = useVibeLoopContext();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);

  const handleCreate = async (data: any) => {
    const ws = await createWorkspace(data);
    setShowForm(false);
    navigate(`/vibeloop/${ws.id}`);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <FadeIn>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-xl font-semibold text-primary-light tracking-tight">VibeLoop</h1>
              <p className="text-body text-secondary-midGray mt-1">
                Automate your project with AI-driven implementation loops
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 text-small font-medium rounded-md bg-accent-orange text-primary-dark hover:bg-accent-orange/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Workspace
            </button>
          </div>
        </FadeIn>

        {showForm && (
          <FadeIn>
            <div className="mb-8">
              <WorkspaceSetupForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
            </div>
          </FadeIn>
        )}

        {loading && workspaces.length === 0 && (
          <div className="text-center py-12 text-secondary-midGray">Loading...</div>
        )}

        {!loading && workspaces.length === 0 && !showForm && (
          <FadeIn>
            <div className="text-center py-16 border border-dashed border-secondary-borderGray rounded-md">
              <p className="text-body text-secondary-midGray mb-4">No workspaces yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="text-small text-accent-orange hover:underline"
              >
                Create your first workspace
              </button>
            </div>
          </FadeIn>
        )}

        <div className="space-y-3">
          {workspaces.map((ws) => (
            <motion.div
              key={ws.id}
              layout
              className="bg-secondary-darkSurface border border-secondary-borderGray rounded-md p-4 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-body font-medium text-primary-light truncate">{ws.projectName}</h3>
                <p className="text-small text-secondary-midGray mt-0.5 truncate">{ws.objective}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-small px-2 py-0.5 rounded ${
                    ws.status === 'active' ? 'bg-accent-orange/10 text-accent-orange' :
                    ws.status === 'connected' ? 'bg-success-green/10 text-success-green' :
                    'bg-secondary-darkSurface text-secondary-midGray'
                  }`}>
                    {ws.status}
                  </span>
                  <span className="text-small text-secondary-midGray">
                    {ws.checklist.length} items
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => deleteWorkspace(ws.id)}
                  className="p-1.5 rounded-md text-secondary-midGray hover:text-semantic-dangerRed transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate(`/vibeloop/${ws.id}`)}
                  className="p-1.5 rounded-md text-secondary-midGray hover:text-accent-orange transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
