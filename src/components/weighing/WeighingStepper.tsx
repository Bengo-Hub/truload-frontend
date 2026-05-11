"use client";

import { WEIGHING_STEPS } from '@/lib/weighing-utils';
import { WeighingStep } from '@/types/weighing';
import { WeighingStepperNav } from './WeighingStepperNav';

interface WeighingStepperProps {
  currentStep: WeighingStep;
  completedSteps: WeighingStep[];
  onStepClick?: (step: WeighingStep) => void;
  className?: string;
}

/**
 * Enforcement weighing stepper — wraps WeighingStepperNav with the three
 * enforcement-specific steps (Capture → Vehicle → Decision).
 */
export function WeighingStepper({
  currentStep,
  completedSteps,
  onStepClick,
  className,
}: WeighingStepperProps) {
  return (
    <WeighingStepperNav
      steps={WEIGHING_STEPS}
      currentStep={currentStep}
      completedSteps={completedSteps}
      onStepClick={onStepClick ? (id) => onStepClick(id as WeighingStep) : undefined}
      className={className}
      label="Enforcement weighing progress"
    />
  );
}
