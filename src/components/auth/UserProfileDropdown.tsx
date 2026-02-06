/**
 * User profile dropdown component.
 * Displays user avatar + name inline, with dropdown for details and logout.
 */

'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function UserProfileDropdown() {
  const router = useRouter();
  const { user, logout } = useAuth();

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  const initials = (user.fullName || '')
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();

  const displayRole = user.roles?.[0]?.replace(/_/g, ' ') || 'User';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-gray-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
          {/* Avatar */}
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-semibold ring-2 ring-white shadow-sm">
            {initials || '?'}
          </div>
          {/* Name + Role (hidden on small screens) */}
          <div className="hidden sm:flex flex-col items-start leading-none">
            <span className="text-sm font-medium text-gray-800 truncate max-w-[120px]">
              {user.fullName || 'User'}
            </span>
            <span className="text-[10px] text-gray-400 capitalize truncate max-w-[120px]">
              {displayRole}
            </span>
          </div>
          <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-semibold flex-shrink-0">
              {initials || '?'}
            </div>
            <div className="flex flex-col space-y-0.5 min-w-0">
              <p className="text-sm font-medium leading-none truncate">{user.fullName || 'User'}</p>
              <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
              <p className="text-[10px] leading-none text-emerald-600 font-medium capitalize">{displayRole}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/profile')} className="gap-2">
          <UserIcon className="h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="gap-2 text-red-600 focus:text-red-600">
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
