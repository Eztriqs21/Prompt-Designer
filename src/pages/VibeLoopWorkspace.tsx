import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useVibeLoopContext } from '../context/VibeLoopContext';
import WorkspaceDashboard from '../components/vibeloop/WorkspaceDashboard';
import FadeIn from '../components/ui/FadeIn';

export default function VibeLoopWorkspace() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { activeWorkspace, selectWorkspace, loading } = useVibeLoopContext();

  useEffect(() => {
    if (workspaceId) {
      selectWorkspace(workspaceId);
    }
  }, [workspaceId, selectWorkspace]);

  if (loading && !activeWorkspace) {
    return (
      <div className="h-full flex items-center justify-center text-secondary-midGray">
        Loading workspace...
      </div>
    );
  }

  if (!activeWorkspace) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <p className="text-secondary-midGray">Workspace not found</p>
        <button
          onClick={() => navigate('/vibeloop')}
          className="text-small text-accent-orange hover:underline"
        >
          Back to VibeLoop
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <FadeIn>
          <button
            onClick={() => navigate('/vibeloop')}
            className="flex items-center gap-1.5 text-small text-secondary-midGray hover:text-primary-light transition-colors mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to workspaces
          </button>
        </FadeIn>
        <WorkspaceDashboard workspace={activeWorkspace} />
      </div>
    </div>
  );
}
