import { redirect } from 'next/navigation';

/**
 * Case management detail: redirects to the shared case detail page.
 * Subfiles A–J, hearings, diary, closure are shown on /cases/[id].
 */
export default async function CaseManagementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/cases/${id}?from=case-management`);
}
