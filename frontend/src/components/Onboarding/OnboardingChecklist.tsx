'use client';

import { useOnboarding } from '@/hooks/useOnboarding';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { onboardingContent } from '@/content/content';

const steps = onboardingContent.checklist.steps;

export function OnboardingChecklist() {
  const { status, isOnboardingActive } = useOnboarding();

  if (!isOnboardingActive || !status) {
    return null;
  }

  const getStepStatus = (stepId: string) => {
    if (!status.step) {
      return stepId === 'task_created' ? 'current' : 'pending';
    }

    const stepOrder = [
      'task_created',
      'project_created',
      'scheduled',
      'calendar_synced',
    ];
    const currentIndex = stepOrder.indexOf(status.step);
    const stepIndex = stepOrder.indexOf(stepId);

    if (stepIndex === -1) return 'pending';
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'completed';
    if (stepIndex === currentIndex + 1) return 'current';
    return 'pending';
  };

  return (
    <div className="p-4 bg-muted/50 rounded-lg border mb-4">
      <h3 className="text-sm font-semibold mb-3">Onboarding</h3>
      <div className="space-y-2">
        {steps.map(step => {
          const stepStatus = getStepStatus(step.id);
          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center gap-2 text-sm',
                stepStatus === 'completed' && 'text-muted-foreground',
                stepStatus === 'current' && 'text-foreground font-medium'
              )}
            >
              {stepStatus === 'completed' ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Circle
                  className={cn(
                    'h-4 w-4',
                    stepStatus === 'current'
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  )}
                />
              )}
              <span>{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
