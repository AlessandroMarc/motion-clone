'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type AnimationPhase = 'initial' | 'newTask' | 'moving' | 'shifted' | 'notification';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

// Pre-existing tasks per day (plenty of tasks already scheduled)
const TASKS_PER_DAY = [3, 2, 3, 2, 3]; // Mon, Tue, Wed, Thu, Fri

export function AnimatedCalendarDemo() {
  const [phase, setPhase] = useState<AnimationPhase>('initial');
  const [showNotification, setShowNotification] = useState(false);
  const [mondayShifted, setMondayShifted] = useState(false);
  const [newBlockVisible, setNewBlockVisible] = useState(false);
  const [newBlockInPosition, setNewBlockInPosition] = useState(false);

  // Animation sequence
  useEffect(() => {
    const runAnimation = () => {
      // Phase 1: Show new task appearing in center
      setTimeout(() => {
        setPhase('newTask');
        setNewBlockVisible(true);
      }, 1500);

      // Phase 2: Move new task to Monday top
      setTimeout(() => {
        setPhase('moving');
        setNewBlockInPosition(true);
      }, 2500);

      // Phase 3: Shift existing Monday blocks down
      setTimeout(() => {
        setPhase('shifted');
        setMondayShifted(true);
      }, 3000);

      // Phase 4: Show notification
      setTimeout(() => {
        setPhase('notification');
        setShowNotification(true);
      }, 3500);

      // Reset and loop
      setTimeout(() => {
        setPhase('initial');
        setShowNotification(false);
        setMondayShifted(false);
        setNewBlockVisible(false);
        setNewBlockInPosition(false);
      }, 6500);
    };

    runAnimation();
    const interval = setInterval(runAnimation, 7000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative max-w-3xl mx-auto">
      <div className="aspect-video rounded-xl bg-linear-to-br from-card to-muted border shadow-2xl overflow-hidden">
        <div className="h-full p-4 sm:p-6">
          {/* Mock calendar header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="text-xs text-muted-foreground font-medium">Your Week</div>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-5 gap-2 h-[calc(100%-2rem)] relative">
            {DAYS.map((day, dayIndex) => (
              <div key={day} className="relative flex flex-col">
                <div className="text-[10px] sm:text-xs text-muted-foreground text-center font-medium mb-2">
                  {day}
                </div>
                <div className="flex-1 relative">
                  {/* Space for new block on Monday */}
                  {dayIndex === 0 && (
                    <div
                      className={cn(
                        'absolute top-0 left-0 right-0 h-6 sm:h-8 transition-all duration-500 ease-out rounded-md overflow-hidden',
                        newBlockInPosition ? 'opacity-100' : 'opacity-0'
                      )}
                    >
                      <div className="h-full bg-green-500 rounded-md flex items-center justify-center shadow-md">
                        <span className="text-[8px] sm:text-[10px] text-white font-medium px-1 truncate">
                          New Task
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Existing blocks container - shifts down on Monday */}
                  <div
                    className={cn(
                      'space-y-1.5 transition-all duration-500 ease-out',
                      dayIndex === 0 && mondayShifted ? 'translate-y-[calc(1.5rem+6px)] sm:translate-y-[calc(2rem+6px)]' : ''
                    )}
                  >
                    {[...Array(TASKS_PER_DAY[dayIndex])].map((_, blockIndex) => (
                      <div
                        key={blockIndex}
                        className={cn(
                          'h-6 sm:h-8 rounded-md',
                          blockIndex === 0 && 'bg-primary/80',
                          blockIndex === 1 && 'bg-primary/50',
                          blockIndex === 2 && 'bg-primary/30',
                          blockIndex >= 3 && 'bg-primary/20'
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Animated new task block - appears center then moves */}
            <div
              className={cn(
                'absolute h-6 sm:h-8 rounded-md bg-green-500 shadow-lg shadow-green-500/30 transition-all duration-700 ease-out flex items-center justify-center z-10',
                !newBlockVisible && 'opacity-0 scale-75',
                newBlockVisible && !newBlockInPosition && 'opacity-100 scale-100',
                newBlockInPosition && 'opacity-0 scale-100'
              )}
              style={{
                width: 'calc(20% - 0.4rem)',
                top: newBlockInPosition ? 'calc(1.5rem + 8px)' : '50%',
                left: newBlockInPosition ? '0' : '50%',
                transform: newBlockInPosition
                  ? 'translate(0, 0)'
                  : newBlockVisible
                    ? 'translate(-50%, -50%)'
                    : 'translate(-50%, -50%) scale(0.75)',
              }}
            >
              {!newBlockInPosition && (
                <Plus className="w-4 h-4 text-white" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notification card */}
      <div
        className={cn(
          'absolute -bottom-4 -right-4 sm:-right-8 bg-card border rounded-lg shadow-lg p-3 sm:p-4 transition-all duration-500',
          showNotification
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium">Task Auto-Scheduled</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Mon 9:00 AM - 10:00 AM</p>
          </div>
        </div>
      </div>

      {/* Floating "Add Task" indicator */}
      <div
        className={cn(
          'absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground rounded-full px-3 py-1.5 text-xs font-medium shadow-lg transition-all duration-500 flex items-center gap-1.5',
          phase === 'newTask'
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        )}
      >
        <Plus className="w-3 h-3" />
        Adding task...
      </div>
    </div>
  );
}
