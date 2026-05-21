import { Require2FASetupGuard } from '@/components/auth/Require2FASetupGuard';
import { SubscriptionBanner } from '@/components/subscription/subscription-banner';

export default function OrgSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Require2FASetupGuard>
      <SubscriptionBanner />
      {children}
    </Require2FASetupGuard>
  );
}
