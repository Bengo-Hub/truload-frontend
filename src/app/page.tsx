/**
 * Root: redirect to public login. Tenant and platform users sign in from the same page.
 */

import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/kura/auth/login');
}
