'use client';

import { useId, useState, useMemo } from 'react';
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
import { ChevronsUpDown, Clock } from 'lucide-react';
import {
  parseDurationSuggestions,
  formatDurationDisplay,
} from '@/utils/durationParser';
import type { DurationSuggestion } from '@/utils/durationParser';

const COMMON_PRESETS: DurationSuggestion[] = [
  { label: '15 minutes', minutes: 15 },
  { label: '30 minutes', minutes: 30 },
  { label: '45 minutes', minutes: 45 },
  { label: '1 hour', minutes: 60 },
  { label: '1 hr 30 min', minutes: 90 },
  { label: '2 hours', minutes: 120 },
  { label: '3 hours', minutes: 180 },
];

interface DurationInputProps {
  value: number;
  onChange: (minutes: number) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  id?: string;
  min?: number;
  className?: string;
}

export function DurationInput({
  value,
  onChange,
  label,
  placeholder = 'Select duration...',
  error,
  id,
  min = 0,
  className,
}: DurationInputProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const errorId = error ? `${controlId}-error` : undefined;
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const suggestions = useMemo(
    () => parseDurationSuggestions(inputValue).filter(s => s.minutes >= min),
    [inputValue, min]
  );

  const handleSelect = (minutes: number) => {
    onChange(minutes);
    setOpen(false);
    setInputValue('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setInputValue('');
    }
  };

  const showClearOption = min <= 0 && value > 0;

  const displayValue = value > 0 ? formatDurationDisplay(value) : placeholder;

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={controlId}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block"
        >
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id={controlId}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 opacity-50" />
              <span className={value > 0 ? '' : 'text-muted-foreground'}>
                {displayValue}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Type a number (e.g. 30, 1.5)..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              {inputValue.trim() === '' ? (
                <CommandGroup heading="Common durations">
                  {showClearOption && (
                    <CommandItem value="0" onSelect={() => handleSelect(0)}>
                      0 min
                    </CommandItem>
                  )}
                  {COMMON_PRESETS.filter(p => p.minutes >= min).map(preset => (
                    <CommandItem
                      key={preset.minutes}
                      value={String(preset.minutes)}
                      onSelect={() => handleSelect(preset.minutes)}
                    >
                      {preset.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : suggestions.length === 0 ? (
                <CommandEmpty>
                  Enter a positive number to see suggestions
                </CommandEmpty>
              ) : (
                <CommandGroup heading="Interpret as">
                  {suggestions.map(suggestion => (
                    <CommandItem
                      key={suggestion.minutes}
                      value={String(suggestion.minutes)}
                      onSelect={() => handleSelect(suggestion.minutes)}
                    >
                      <div className="flex flex-col">
                        <span>{suggestion.label}</span>
                        <span className="text-xs text-muted-foreground">
                          = {suggestion.minutes} min
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && (
        <p id={errorId} className="text-sm text-red-500 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
