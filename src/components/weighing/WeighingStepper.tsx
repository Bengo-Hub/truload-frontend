"use client";

import { cn } from '@/lib/utils';
import { WEIGHING_STEPS } from '@/lib/weighing-utils';
import { WeighingStep } from '@/types/weighing';
import { Check } from 'lucide-react';

interface WeighingStepperProps {
  currentStep: WeighingStep;
  completedSteps: WeighingStep[];
  onStepClick?: (step: WeighingStep) => void;
  className?: string;
}

/**
 * WeighingStepper - Horizontal timeline for weighing workflow
 *
 * Displays the 3-step weighing process:
 * 1. Capture - Scale test, images & plate entry
 * 2. Vehicle - Details, weights & compliance (combined)
 * 3. Decision - Take action (print, tag, yard)
 */
export function WeighingStepper({
  currentStep,
  completedSteps,
  onStepClick,
  className,
}: WeighingStepperProps) {
  const currentIndex = WEIGHING_STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className={cn('w-full', className)}>
      <nav aria-label="Weighing progress">
        <ol className="flex items-center justify-between">
          {WEIGHING_STEPS.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = step.id === currentStep;
            const isClickable = onStepClick && (isCompleted || index === currentIndex + 1);

            return (
              <li key={step.id} className="relative flex-1">
                {/* Connector line */}
                {index > 0 && (
                  <div
                    className={cn(
                      'absolute left-0 right-1/2 top-4 h-0.5 -translate-y-1/2',
                      isCompleted || isCurrent ? 'bg-emerald-500' : 'bg-gray-200'
                    )}
                    aria-hidden="true"
                  />
                )}
                {index < WEIGHING_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'absolute left-1/2 right-0 top-4 h-0.5 -translate-y-1/2',
                      completedSteps.includes(WEIGHING_STEPS[index + 1]?.id) ||
                      (isCompleted && !isCurrent)
                        ? 'bg-emerald-500'
                        : 'bg-gray-200'
                    )}
                    aria-hidden="true"
                  />
                )}

                {/* Step indicator */}
                <div
                  className={cn(
                    'relative flex flex-col items-center',
                    isClickable && 'cursor-pointer'
                  )}
                  onClick={() => isClickable && onStepClick?.(step.id)}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                      isCompleted
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : isCurrent
                          ? 'border-emerald-500 bg-white text-emerald-500'
                          : 'border-gray-300 bg-white text-gray-400'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>

                  {/* Step label */}
                  <div className="mt-2 text-center">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        isCurrent
                          ? 'text-emerald-600'
                          : isCompleted
                            ? 'text-gray-900'
                            : 'text-gray-400'
                      )}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500 hidden sm:block">{step.description}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
