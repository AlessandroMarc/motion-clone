'use client';

import { useState } from 'react';
import { WeekCalendar } from '@/components/Calendar';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';
import { CalendarTasksPanel } from '@/components/Tasks';

export default function CalendarPage() {
  const [taskPanelRefresh, setTaskPanelRefresh] = useState(0);

  const handleTaskDropped = () => {
    // Trigger refresh of CalendarTasksPanel
    setTaskPanelRefresh(prev => prev + 1);
  };

  return (
    <ProtectedRoute>
      <div className="flex-1 p-3 md:p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          <div className="lg:col-span-8">
            <WeekCalendar onTaskDropped={handleTaskDropped} />
          </div>
          <div className="lg:col-span-4">
            <div className="border rounded-lg p-4 h-[calc(100vh-200px)] md:h-[calc(100vh-140px)] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-3">Tasks</h2>
              {/* Pass current week start as today (WeekCalendar maintains week internally, but we can align by today's week) */}
              <CalendarTasksPanel
                currentWeekStart={new Date()}
                refreshTrigger={taskPanelRefresh}
              />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
