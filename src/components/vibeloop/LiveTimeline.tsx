import { useEffect } from 'react';
import type { RunEvent } from '../../types/vibeloop';
import { useVibeLoopContext } from '../../context/VibeLoopContext';

interface Props {
  runId: string;
  events: RunEvent[];
}

const STAGE_COLORS: Record<string, string> = {
  initial_implementation: 'bg-accent-purple',
  agent_executing: 'bg-accent-orange',
  awaiting_result: 'bg-accent-orange animate-pulse',
  auditing: 'bg-accent-purple',
  needs_fix: 'bg-warn-yellow',
  generating_fix_prompt: 'bg-accent-orange',
  continuing: 'bg-accent-orange',
  final_summary: 'bg-success-green',
  complete: 'bg-success-green',
};

const STAGE_LABELS: Record<string, string> = {
  initial_implementation: 'Initial Implementation',
  agent_executing: 'Agent Executing',
  awaiting_result: 'Awaiting Result',
  auditing: 'Auditing',
  needs_fix: 'Needs Fix',
  generating_fix_prompt: 'Generating Fix Prompt',
  continuing: 'Continuing',
  final_summary: 'Final Summary',
  complete: 'Complete',
};

export default function LiveTimeline({ runId, events }: Props) {
  const { loadRunEvents } = useVibeLoopContext();

  useEffect(() => {
    loadRunEvents(runId);
  }, [runId, loadRunEvents]);

  if (events.length === 0) {
    return <p className="text-small text-secondary-midGray py-4">No events yet</p>;
  }

  return (
    <div className="space-y-0">
      {[...events].reverse().map((event, i) => (
        <div key={i} className="flex items-start gap-3 relative">
          {/* Vertical line */}
          {i < events.length - 1 && (
            <div className="absolute left-[7px] top-5 w-px h-full bg-secondary-borderGray" />
          )}
          {/* Dot */}
          <div className={`w-[15px] h-[15px] rounded-full shrink-0 mt-1 ${STAGE_COLORS[event.stage] || 'bg-secondary-midGray'}`} />
          {/* Content */}
          <div className="flex-1 min-w-0 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-small font-medium text-primary-light">
                {STAGE_LABELS[event.stage] || event.stage}
              </span>
              <span className="text-xs text-secondary-midGray">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-xs text-secondary-midGray mt-0.5">
              {event.type.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
