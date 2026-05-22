import { Require2FASetupGuard } from '@/components/auth/Require2FASetupGuard';
import { SubscriptionBanner } from '@/components/subscription/subscription-banner';
import { ManifestInjector } from '@/components/ManifestInjector';

export default function OrgSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  return (
    <Require2FASetupGuard>
      <ManifestInjector paramsPromise={params} />
      <SubscriptionBanner />
      {children}
    </Require2FASetupGuard>
  );
}
