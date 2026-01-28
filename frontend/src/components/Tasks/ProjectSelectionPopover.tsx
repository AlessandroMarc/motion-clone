import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Folder, Check } from 'lucide-react';
import type { Project } from '@/types';

interface ProjectSelectionPopoverProps {
  availableProjects: Project[];
  onProjectSelect: (projectId: string) => void;
  onClose: () => void;
}

export function ProjectSelectionPopover({
  availableProjects,
  onProjectSelect,
  onClose,
}: ProjectSelectionPopoverProps) {
  const [searchValue, setSearchValue] = useState('');

  const filteredProjects = availableProjects.filter(project =>
    project.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <Popover open={true} onOpenChange={onClose}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto font-normal px-3 py-2 text-muted-foreground hover:text-foreground border-0 rounded-none"
        >
          <Folder className="h-3 w-3 text-muted-foreground mr-2" />
          Select project...
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search projects..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {filteredProjects.length === 0 ? (
              <CommandEmpty>No projects found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredProjects.map(project => (
                  <CommandItem
                    key={project.id}
                    value={project.id}
                    onSelect={() => onProjectSelect(project.id)}
                  >
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
                    <Check className="mr-2 h-4 w-4 opacity-0" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
