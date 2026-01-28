'use client';

import { useState } from 'react';
import { WeekCalendar } from '@/components/Calendar';
import { ZenModeView } from '@/components/Calendar/ZenModeView';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';
import { CalendarTasksPanel } from '@/components/Tasks';
import { Button } from '@/components/ui/button';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnboardingWelcomeBanner } from '@/components/Onboarding/OnboardingWelcomeBanner';
import { useIsMobile } from '@/hooks/use-mobile';

export default function CalendarPage() {
  const [taskPanelRefresh, setTaskPanelRefresh] = useState(0);
  const [taskPanelOpen, setTaskPanelOpen] = useState(true);
  const [zenMode, setZenMode] = useState(false);
  const isMobile = useIsMobile();

  const handleTaskDropped = () => {
    // Trigger refresh of CalendarTasksPanel
    setTaskPanelRefresh(prev => prev + 1);
  };

  // Show zen mode view when enabled
  if (zenMode) {
    return (
      <ProtectedRoute>
        <ZenModeView onExit={() => setZenMode(false)} />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex-1 p-2 md:p-4 relative">
        <div className="flex gap-3">
          {/* Calendar takes full width when panel closed */}
          <div
            className={cn(
              'flex-1 transition-all duration-300',
              taskPanelOpen ? 'lg:mr-[280px]' : ''
            )}
          >
            <OnboardingWelcomeBanner />
            <WeekCalendar
              onTaskDropped={handleTaskDropped}
              onZenMode={() => setZenMode(true)}
            />
          </div>

          {/* Floating toggle + task panel: hidden on mobile */}
          {!isMobile && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTaskPanelOpen(!taskPanelOpen)}
                className={cn(
                  'fixed right-3 top-20 z-40 h-9 w-9 shadow-md bg-background',
                  taskPanelOpen && 'lg:right-[290px]'
                )}
                title={taskPanelOpen ? 'Hide tasks' : 'Show tasks'}
              >
                {taskPanelOpen ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" />
                )}
              </Button>
              <div
                className={cn(
                  'fixed right-0 top-0 h-full w-[280px] bg-background border-l shadow-lg z-30 transition-transform duration-300 pt-14',
                  taskPanelOpen ? 'translate-x-0' : 'translate-x-full'
                )}
              >
                <div className="p-3 h-full overflow-y-auto">
                  <h2 className="text-sm font-subheading mb-3">Tasks</h2>
                  <CalendarTasksPanel
                    currentWeekStart={new Date()}
                    refreshTrigger={taskPanelRefresh}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
