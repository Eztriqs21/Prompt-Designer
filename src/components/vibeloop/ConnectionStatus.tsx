import type { Workspace } from '../../types/vibeloop';
import { Wifi, WifiOff } from 'lucide-react';

interface Props {
  workspace: Workspace;
}

export default function ConnectionStatus({ workspace }: Props) {
  const isConnected = workspace.status === 'connected' || workspace.status === 'active';

  return (
    <div className="flex items-center gap-2 text-small">
      {isConnected ? (
        <>
          <Wifi className="w-4 h-4 text-success-green" />
          <span className="text-success-green">Connected</span>
          {workspace.connectedAt && (
            <span className="text-secondary-midGray text-xs">
              since {new Date(workspace.connectedAt).toLocaleTimeString()}
            </span>
          )}
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-secondary-midGray" />
          <span className="text-secondary-midGray">Not connected</span>
        </>
      )}
    </div>
  );
}
