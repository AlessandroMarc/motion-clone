/**
 * Shared project color palette.
 * Each entry has variants for different UI contexts (kanban badge vs calendar event card).
 */

export const PROJECT_COLORS = [
  'bg-blue-500/20 text-blue-600',
  'bg-purple-500/20 text-purple-600',
  'bg-emerald-500/20 text-emerald-600',
  'bg-orange-500/20 text-orange-600',
  'bg-pink-500/20 text-pink-600',
  'bg-cyan-500/20 text-cyan-600',
  'bg-yellow-500/20 text-yellow-600',
  'bg-rose-500/20 text-rose-600',
] as const;

/** Calendar event card border colors: active and completed states */
export const PROJECT_CALENDAR_COLORS = [
  {
    border: 'border-l-[3px] border-blue-500',
    completedBorder: 'border-l-[3px] border-blue-300',
  },
  {
    border: 'border-l-[3px] border-purple-500',
    completedBorder: 'border-l-[3px] border-purple-300',
  },
  {
    border: 'border-l-[3px] border-emerald-500',
    completedBorder: 'border-l-[3px] border-emerald-300',
  },
  {
    border: 'border-l-[3px] border-orange-500',
    completedBorder: 'border-l-[3px] border-orange-300',
  },
  {
    border: 'border-l-[3px] border-pink-500',
    completedBorder: 'border-l-[3px] border-pink-300',
  },
  {
    border: 'border-l-[3px] border-cyan-500',
    completedBorder: 'border-l-[3px] border-cyan-300',
  },
  {
    border: 'border-l-[3px] border-yellow-500',
    completedBorder: 'border-l-[3px] border-yellow-300',
  },
  {
    border: 'border-l-[3px] border-rose-500',
    completedBorder: 'border-l-[3px] border-rose-300',
  },
] as const;

/** Default border for tasks with no project */
export const DEFAULT_TASK_CALENDAR_COLOR = {
  border: 'border-l-[3px] border-slate-400',
  completedBorder: 'border-l-[3px] border-slate-300',
};

/**
 * Returns a consistent color index for a given project ID.
 * Uses a simple char-code hash so the same project always gets the same color.
 */
export function getProjectColorIndex(projectId: string): number {
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = (hash + projectId.charCodeAt(i)) % PROJECT_COLORS.length;
  }
  return hash;
}
