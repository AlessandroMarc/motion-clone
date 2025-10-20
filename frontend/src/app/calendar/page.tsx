'use client';

import { WeekCalendar } from '@/components/Calendar/WeekCalendar';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <WeekCalendar />
        </div>
      </div>
    </ProtectedRoute>
  );
}

