'use client';

import { use, useEffect } from 'react';

export function ManifestInjector({
  paramsPromise,
}: {
  paramsPromise: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(paramsPromise);

  useEffect(() => {
    if (!orgSlug) return;
    const manifestUrl = `/${orgSlug}/manifest.webmanifest`;
    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    link.href = manifestUrl;
  }, [orgSlug]);

  return null;
}
