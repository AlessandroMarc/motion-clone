import { useState, useEffect, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { taskService } from '@/services/taskService';
import type { Task } from '@/../../../shared/types';

interface TaskBlockedByFieldProps {
  errors?: any;
  currentTaskId?: string; // For edit mode, to exclude current task
}

export function TaskBlockedByField({
  errors,
  currentTaskId,
}: TaskBlockedByFieldProps) {
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const { setValue, watch } = useFormContext();
  const selectedProjectId = watch('project_id');
  const selectedBlockedBy = watch('blockedBy') || [];

  // Fetch tasks from the selected project
  useEffect(() => {
    const fetchTasks = async () => {
      if (!selectedProjectId) {
        setTasks([]);
        return;
      }

      try {
        setIsLoading(true);
        const fetchedTasks = await taskService.getTasksByProject(selectedProjectId);
        // Exclude current task if in edit mode
        const filteredTasks = currentTaskId
          ? fetchedTasks.filter(task => task.id !== currentTaskId)
          : fetchedTasks;
        setTasks(filteredTasks);
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
        setTasks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [selectedProjectId, currentTaskId]);

  // Filter tasks based on search value
  const filteredTasks = useMemo(() => {
    if (!searchValue) return tasks;
    return tasks.filter(task =>
      task.title.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [tasks, searchValue]);

  const handleToggle = (taskId: string) => {
    const current = selectedBlockedBy || [];
    if (current.includes(taskId)) {
      setValue(
        'blockedBy',
        current.filter(id => id !== taskId),
        { shouldValidate: true, shouldDirty: true }
      );
    } else {
      setValue(
        'blockedBy',
        [...current, taskId],
        { shouldValidate: true, shouldDirty: true }
      );
    }
  };

  const handleRemove = (taskId: string) => {
    const current = selectedBlockedBy || [];
    setValue(
      'blockedBy',
      current.filter(id => id !== taskId),
      { shouldValidate: true, shouldDirty: true }
    );
  };

  const selectedTasks = tasks.filter(task =>
    selectedBlockedBy.includes(task.id)
  );

  if (!selectedProjectId) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Blocked By (Optional)
        </label>
        <div className="flex items-center gap-2 p-3 border border-dashed rounded-md bg-muted/20">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Select a project first to choose blocking tasks
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        Blocked By (Optional)
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between min-h-[42px] h-auto"
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {selectedTasks.length > 0 ? (
                selectedTasks.map(task => (
                  <Badge
                    key={task.id}
                    variant="secondary"
                    className="mr-1 mb-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(task.id);
                    }}
                  >
                    {task.title}
                    <button
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRemove(task.id);
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemove(task.id);
                      }}
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">
                  Select blocking tasks...
                </span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search tasks..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {isLoading ? (
                <CommandEmpty>Loading tasks...</CommandEmpty>
              ) : filteredTasks.length === 0 ? (
                <CommandEmpty>No tasks found in this project.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredTasks.map(task => {
                    const isSelected = selectedBlockedBy.includes(task.id);
                    return (
                      <CommandItem
                        key={task.id}
                        value={task.id}
                        onSelect={() => handleToggle(task.id)}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            isSelected ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <div className="flex flex-col flex-1">
                          <span className="text-sm font-medium">
                            {task.title}
                          </span>
                          {task.description && (
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {task.description}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {errors?.blockedBy && (
        <p className="text-sm text-destructive">
          {errors.blockedBy.message}
        </p>
      )}
    </div>
  );
}


