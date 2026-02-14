'use client';

import type { LucideIcon } from 'lucide-react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useHasPermission } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export interface ActionItem {
  /** Unique key */
  key: string;
  /** Permission code(s) required */
  permission: string | string[];
  /** Match mode: 'any' (default) or 'all' */
  match?: 'any' | 'all';
  /** Lucide icon component */
  icon?: LucideIcon;
  /** Action label */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Use destructive (red) styling */
  destructive?: boolean;
  /** Additional condition to show */
  condition?: boolean;
  /** Disable this action */
  disabled?: boolean;
  /** Insert separator before this item */
  separatorBefore?: boolean;
}

interface PermissionActionGroupProps {
  /** Action definitions */
  actions: ActionItem[];
  /** Max inline buttons before overflow to dropdown (default: 3) */
  maxInline?: number;
  /** Additional CSS classes for the container */
  className?: string;
}

function useFilteredActions(actions: ActionItem[]) {
  // We need to check permissions for each action at the top level
  // since hooks can't be called conditionally
  return actions;
}

function ActionButton({ action }: { action: ActionItem }) {
  const hasPermission = useHasPermission(action.permission, action.match ?? 'any');
  if (!hasPermission || action.condition === false) return null;

  const Icon = action.icon;
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={action.onClick}
      disabled={action.disabled}
      className={cn(
        'h-8 w-8',
        action.destructive && 'text-red-600 hover:text-red-700 hover:bg-red-50'
      )}
      title={action.label}
    >
      {Icon && <Icon className="h-4 w-4" />}
    </Button>
  );
}

function DropdownAction({ action }: { action: ActionItem }) {
  const hasPermission = useHasPermission(action.permission, action.match ?? 'any');
  if (!hasPermission || action.condition === false) return null;

  const Icon = action.icon;
  return (
    <>
      {action.separatorBefore && <DropdownMenuSeparator />}
      <DropdownMenuItem
        onClick={action.onClick}
        disabled={action.disabled}
        className={cn(
          action.destructive && 'text-red-600 focus:text-red-600 focus:bg-red-50'
        )}
      >
        {Icon && <Icon className="h-4 w-4 mr-2" />}
        {action.label}
      </DropdownMenuItem>
    </>
  );
}

export function PermissionActionGroup({
  actions,
  maxInline = 3,
  className,
}: PermissionActionGroupProps) {
  const filteredActions = useFilteredActions(actions);

  if (filteredActions.length === 0) return null;

  // If few enough actions, render all inline
  if (filteredActions.length <= maxInline) {
    return (
      <div className={cn('flex items-center justify-end gap-1', className)}>
        {filteredActions.map((action) => (
          <ActionButton key={action.key} action={action} />
        ))}
      </div>
    );
  }

  // Split into inline + overflow dropdown
  const inlineActions = filteredActions.slice(0, maxInline - 1);
  const overflowActions = filteredActions.slice(maxInline - 1);

  return (
    <div className={cn('flex items-center justify-end gap-1', className)}>
      {inlineActions.map((action) => (
        <ActionButton key={action.key} action={action} />
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {overflowActions.map((action) => (
            <DropdownAction key={action.key} action={action} />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
