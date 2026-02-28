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
import type { TaskFormData } from '@/hooks/useTaskForm';

interface TaskScheduleFieldProps {
  errors?: FieldErrors<TaskFormData>;
  id?: string;
}

export function TaskScheduleField({
  errors,
  id = 'scheduleId',
}: TaskScheduleFieldProps) {
  const { user, activeSchedule } = useAuth();
  const { watch, setValue } = useFormContext<TaskFormData>();
  const selectedScheduleId = watch('scheduleId');

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSchedules = async () => {
      if (!user?.id) {
        setSchedules([]);
        return;
      }

      setIsLoading(true);
      try {
        const userSchedules = await userSettingsService.getUserSchedules(user.id);
        setSchedules(userSchedules);
      } catch (error) {
        console.error('Failed to fetch schedules:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedules();
  }, [user?.id]);

  useEffect(() => {
    if (selectedScheduleId) {
      return;
    }

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

  // Auto-select silently when there's only one schedule (or still loading)
  if (!isLoading && schedules.length <= 1 && selectedScheduleId) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Schedule</Label>
      <Select
        value={selectedScheduleId || ''}
        onValueChange={value =>
          setValue('scheduleId', value, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Select schedule" />
        </SelectTrigger>
        <SelectContent>
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
