'use client';

import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHasPermission } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export interface PermissionActionButtonProps {
  /** Permission code(s) required */
  permission: string | string[];
  /** Match mode: 'any' (default) requires at least one, 'all' requires every permission */
  match?: 'any' | 'all';
  /** Lucide icon component */
  icon?: LucideIcon;
  /** Button label text (optional for icon-only buttons) */
  label?: string;
  /** Click handler */
  onClick: () => void;
  /** Use destructive (red) styling */
  destructive?: boolean;
  /** Hide completely when unauthorized (default: true). If false, shows disabled button. */
  hideWhenUnauthorized?: boolean;
  /** Additional condition to show/enable the button */
  condition?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Button size - defaults to 'icon' when no label, 'sm' when label is present */
  size?: 'default' | 'sm' | 'icon' | 'lg';
  /** Disable the button */
  disabled?: boolean;
}

export function PermissionActionButton({
  permission,
  match = 'any',
  icon: Icon,
  label,
  onClick,
  destructive = false,
  hideWhenUnauthorized = true,
  condition = true,
  className,
  size,
  disabled = false,
}: PermissionActionButtonProps) {
  const hasPermission = useHasPermission(permission, match);

  // If condition is false, don't render
  if (!condition) return null;

  // If no permission and should hide, don't render
  if (!hasPermission && hideWhenUnauthorized) return null;

  const resolvedSize = size ?? (label ? 'sm' : 'icon');
  const variant = destructive ? 'ghost' : 'ghost';

  return (
    <Button
      variant={variant}
      size={resolvedSize}
      onClick={onClick}
      disabled={disabled || !hasPermission}
      className={cn(
        destructive && 'text-red-600 hover:text-red-700 hover:bg-red-50',
        className
      )}
      title={label}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {label && resolvedSize !== 'icon' && <span>{label}</span>}
    </Button>
  );
}
