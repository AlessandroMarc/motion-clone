import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { userSettingsService } from '@/services/userSettingsService';
import type { Schedule } from '@shared/types';
import { toast } from 'sonner';

export function useSchedules() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSchedules = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const userSchedules = await userSettingsService.getUserSchedules(user.id);
      setSchedules(userSchedules);
    } catch (error) {
      console.error('Failed to load schedules:', error);
      toast.error('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadSchedules();
    }
  }, [user?.id, loadSchedules]);

  const createSchedule = useCallback(
    async (
      name: string,
      workingHoursStart: number,
      workingHoursEnd: number
    ) => {
      if (!user?.id) return;

      const newSchedule = await userSettingsService.createSchedule(
        user.id,
        name,
        workingHoursStart,
        workingHoursEnd,
        schedules.length === 0 // First schedule is default
      );

      await loadSchedules();

      // If this is the first schedule, set it as active
      if (schedules.length === 0) {
        await userSettingsService.setActiveSchedule(user.id, newSchedule.id);
        toast.success('Schedule set as active');
      }

      return newSchedule;
    },
    [user?.id, schedules.length, loadSchedules]
  );

  const updateSchedule = useCallback(
    async (
      scheduleId: string,
      name: string,
      workingHoursStart: number,
      workingHoursEnd: number
    ) => {
      if (!user?.id) return;

      await userSettingsService.updateSchedule(
        scheduleId,
        user.id,
        name,
        workingHoursStart,
        workingHoursEnd
      );

      await loadSchedules();
    },
    [user?.id, loadSchedules]
  );

  const setActiveSchedule = useCallback(
    async (scheduleId: string) => {
      if (!user?.id) return;

      await userSettingsService.setActiveSchedule(user.id, scheduleId);
      toast.success('Active schedule updated');
      // Reload to refresh activeSchedule in context
      window.location.reload();
    },
    [user?.id]
  );

  return {
    schedules,
    loading,
    loadSchedules,
    createSchedule,
    updateSchedule,
    setActiveSchedule,
  };
}







