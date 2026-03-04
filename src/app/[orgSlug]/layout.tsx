import { Require2FASetupGuard } from '@/components/auth/Require2FASetupGuard';

/**
 * Layout for tenant-scoped routes. All app routes under [orgSlug] share this layout.
 * orgSlug is available via useParams() in child pages and components.
 * When org requires 2FA and user has not set it up, Require2FASetupGuard redirects to profile.
 */
export default function OrgSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Require2FASetupGuard>{children}</Require2FASetupGuard>;
}
