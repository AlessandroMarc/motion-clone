import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { userSettingsService } from '@/services/userSettingsService';
import { useAuth } from '@/contexts/AuthContext';
import type { FieldErrors } from 'react-hook-form';
import type { Schedule } from '@/types';
import type { ProjectFormData } from '@/hooks/useProjectForm';

interface ProjectScheduleFieldProps {
  errors?: FieldErrors<ProjectFormData>;
  id?: string;
}

export function ProjectScheduleField({
  errors,
  id = 'scheduleId',
}: ProjectScheduleFieldProps) {
  const { user, activeSchedule } = useAuth();
  const { watch, setValue } = useFormContext<ProjectFormData>();
  const selectedScheduleId = watch('scheduleId');

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchSchedules = async () => {
      if (!user?.id) {
        setSchedules([]);
        return;
      }

      setIsLoading(true);
      try {
        const userSchedules = await userSettingsService.getUserSchedules(
          user.id
        );
        if (!cancelled) {
          setSchedules(userSchedules);
        }
      } catch (error) {
        console.error('Failed to fetch schedules:', error);
        if (!cancelled) {
          setSchedules([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchSchedules();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    // If the form has not yet selected a schedule, default to the user's active schedule
    if (selectedScheduleId) return;
    if (activeSchedule?.id) {
      setValue('scheduleId', activeSchedule.id, {
        shouldDirty: false,
        shouldValidate: true,
      });
      return;
    }
    if (schedules.length > 0) {
      setValue('scheduleId', schedules[0].id, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [activeSchedule?.id, schedules, selectedScheduleId, setValue]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Project schedule (optional)</Label>
      <Select
        value={selectedScheduleId || ''}
        onValueChange={value =>
          setValue('scheduleId', value, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Use your personal default schedule" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Use personal default schedule</SelectItem>
          {isLoading && (
            <SelectItem value="__loading" disabled>
              Loading schedules...
            </SelectItem>
          )}
          {!isLoading && schedules.length === 0 && (
            <SelectItem value="__none" disabled>
              No schedules available
            </SelectItem>
          )}
          {schedules.map(schedule => (
            <SelectItem key={schedule.id} value={schedule.id}>
              {schedule.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errors?.scheduleId && (
        <p className="text-sm text-destructive">{errors.scheduleId.message}</p>
      )}
    </div>
  );
}
