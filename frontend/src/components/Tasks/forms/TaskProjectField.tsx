import { useState, useEffect } from 'react';
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
import { Check, ChevronsUpDown, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { projectService } from '@/services/projectService';
import type { Project } from '@/../../../shared/types';

interface TaskProjectFieldProps {
  errors?: any;
}

export function TaskProjectField({ errors }: TaskProjectFieldProps) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const { setValue, watch } = useFormContext();
  const selectedProjectId = watch('project_id');

  // Debug log for projectId value
  useEffect(() => {
    console.log(
      'TaskProjectField: Current projectId value:',
      selectedProjectId
    );
  }, [selectedProjectId]);

  // Fetch projects on component mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        const fetchedProjects = await projectService.getAllProjects();
        setProjects(fetchedProjects);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Filter projects based on search value
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  const selectedProject = projects.find(
    project => project.id === selectedProjectId
  );

  const handleSelect = (projectId: string) => {
    console.log('TaskProjectField: Selecting project:', projectId);
    if (projectId === selectedProjectId) {
      setValue('project_id', null, { shouldValidate: true, shouldDirty: true });
      console.log('TaskProjectField: Cleared project selection');
    } else {
      setValue('project_id', projectId, {
        shouldValidate: true,
        shouldDirty: true,
      });
      console.log('TaskProjectField: Set project to:', projectId);
    }
    setOpen(false);
  };

  const handleClear = () => {
    console.log('TaskProjectField: Clearing project selection');
    setValue('project_id', null, { shouldValidate: true, shouldDirty: true });
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        Project (Optional)
      </label>
      {/* Project selection is handled via setValue/watch, no hidden input needed */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedProject ? (
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                <span className="truncate">{selectedProject.name}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">Select project...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search projects..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {isLoading ? (
                <CommandEmpty>Loading projects...</CommandEmpty>
              ) : filteredProjects.length === 0 ? (
                <CommandEmpty>No projects found.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredProjects.map(project => (
                    <CommandItem
                      key={project.id}
                      value={project.id}
                      onSelect={() => handleSelect(project.id)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedProjectId === project.id
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {project.name}
                          </span>
                          {project.description && (
                            <span className="text-xs text-muted-foreground">
                              {project.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {selectedProject && (
                <CommandGroup>
                  <CommandItem onSelect={handleClear}>
                    <div className="flex items-center gap-2 text-destructive">
                      <Check className="mr-2 h-4 w-4" />
                      Clear selection
                    </div>
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {errors?.projectId && (
        <p className="text-sm text-destructive">{errors.projectId.message}</p>
      )}
    </div>
  );
}
