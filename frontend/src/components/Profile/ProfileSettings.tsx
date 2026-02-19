'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSchedules } from './useSchedules';
import { ActiveScheduleCard } from './ActiveScheduleCard';
import { ScheduleCard } from './ScheduleCard';
import { ScheduleFormDialog } from './ScheduleFormDialog';
import { GoogleCalendarSettings } from './GoogleCalendarSettings';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Schedule } from '@/types';
import { logger } from '@/lib/logger';

export function ProfileSettings() {
  const { activeSchedule } = useAuth();
  const {
    schedules,
    loading,
    createSchedule,
    updateSchedule,
    setActiveSchedule,
  } = useSchedules();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  const handleCreateSchedule = async (data: {
    name: string;
    workingHoursStart: number;
    workingHoursEnd: number;
  }) => {
    try {
      await createSchedule(
        data.name,
        data.workingHoursStart,
        data.workingHoursEnd
      );
      toast.success('Schedule created successfully');
    } catch (error) {
      logger.error('Failed to create schedule:', error);
      toast.error('Failed to create schedule');
    }
  };

  const handleEditSchedule = async (data: {
    name: string;
    workingHoursStart: number;
    workingHoursEnd: number;
  }) => {
    if (!editingSchedule) return;

    try {
      await updateSchedule(
        editingSchedule.id,
        data.name,
        data.workingHoursStart,
        data.workingHoursEnd
      );
      toast.success('Schedule updated successfully');
      setEditingSchedule(null);
    } catch (error) {
      logger.error('Failed to update schedule:', error);
      toast.error('Failed to update schedule');
    }
  };

  const handleSetActive = async (scheduleId: string) => {
    try {
      await setActiveSchedule(scheduleId);
    } catch (error) {
      logger.error('Failed to set active schedule:', error);
      toast.error('Failed to set active schedule');
    }
  };

  const openCreateDialog = () => {
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setIsEditDialogOpen(true);
  };

  const handleEditDialogClose = (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      setEditingSchedule(null);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Current Active Schedule */}
      <Card className="p-4 gap-4">
        <CardHeader className="px-0">
          <CardTitle>Active Schedule</CardTitle>
          <CardDescription>
            The schedule currently used for task scheduling
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <ActiveScheduleCard schedule={activeSchedule} />
        </CardContent>
      </Card>

      {/* Schedules List */}
      <Card className="p-4 gap-4">
        <CardHeader className="px-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle>Schedules</CardTitle>
              <CardDescription>
                Manage your working hour schedules. You can have multiple
                schedules and switch between them.
              </CardDescription>
            </div>
            <Button
              onClick={openCreateDialog}
              className="w-full shrink-0 sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Schedule
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {schedules.length === 0 ? (
            <div className="text-center text-muted-foreground">
              No schedules yet. Create your first schedule to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {schedules.map(schedule => {
                const isActive =
                  activeSchedule?.id === schedule.id ||
                  (schedule.is_default && !activeSchedule);

                return (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    isActive={isActive}
                    onSetActive={handleSetActive}
                    onEdit={openEditDialog}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Schedule Dialog */}
      <ScheduleFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateSchedule}
      />

      {/* Edit Schedule Dialog */}
      <ScheduleFormDialog
        open={isEditDialogOpen}
        onOpenChange={handleEditDialogClose}
        schedule={editingSchedule}
        onSubmit={handleEditSchedule}
      />

      {/* Google Calendar Integration */}
      <GoogleCalendarSettings />
    </div>
  );
}
