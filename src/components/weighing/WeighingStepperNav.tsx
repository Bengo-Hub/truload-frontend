"use client";

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface StepDef {
  id: string;
  title: string;
  description?: string;
}

interface WeighingStepperNavProps {
  steps: StepDef[];
  currentStep: string;
  completedSteps: string[];
  onStepClick?: (step: string) => void;
  className?: string;
  label?: string;
}

/**
 * Generic horizontal step indicator used by both the enforcement and commercial
 * weighing workflows. Pass the step definitions and current / completed state;
 * the component handles connectors, active/done styling, and optional click-to-jump.
 */
export function WeighingStepperNav({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  className,
  label = 'Weighing progress',
}: WeighingStepperNavProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <nav aria-label={label} className={cn('w-full', className)}>
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isClickable = !!onStepClick && (isCompleted || index === currentIndex + 1);

          return (
            <li key={step.id} className="relative flex-1">
              {/* Left connector */}
              {index > 0 && (
                <div
                  className={cn(
                    'absolute left-0 right-1/2 top-4 h-0.5 -translate-y-1/2',
                    isCompleted || isCurrent ? 'bg-emerald-500' : 'bg-gray-200'
                  )}
                  aria-hidden="true"
                />
              )}
              {/* Right connector */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute left-1/2 right-0 top-4 h-0.5 -translate-y-1/2',
                    completedSteps.includes(steps[index + 1]?.id ?? '') || (isCompleted && !isCurrent)
                      ? 'bg-emerald-500'
                      : 'bg-gray-200'
                  )}
                  aria-hidden="true"
                />
              )}

              <div className="relative flex flex-col items-center">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onStepClick?.(step.id)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors z-10',
                    isCompleted
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : isCurrent
                        ? 'bg-white border-emerald-500 text-emerald-600'
                        : 'bg-white border-gray-300 text-gray-400',
                    isClickable ? 'cursor-pointer hover:shadow-md' : 'cursor-default'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                </button>

                <span
                  className={cn(
                    'mt-1 text-xs font-medium',
                    isCurrent ? 'text-emerald-600' : isCompleted ? 'text-gray-900' : 'text-gray-400'
                  )}
                >
                  {step.title}
                </span>

                {step.description && (
                  <span className="text-[10px] text-gray-400 hidden sm:block">{step.description}</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
