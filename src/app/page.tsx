/**
 * Root: redirect to public login. Default tenant for commercial use case is truload-demo.
 * Enforcement tenants (KURA, KENHA, etc.) use their own org-scoped login routes.
 */

import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/truload-demo/auth/login');
}
