import { redirect } from 'next/navigation';

export default function IntegrationsPage({ params }: { params: { orgSlug: string } }) {
  redirect(`/${params.orgSlug}/setup/settings`);
}
