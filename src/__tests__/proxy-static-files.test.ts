/**
 * @jest-environment node
 *
 * On a tenant-branded domain the proxy rewrites paths to /<slug>/..., but files served from
 * public/ (logos, sw.js, manifest.json, offline.html) must pass through untouched: rewriting them
 * to /kura/truload-logo.svg answered 404, so the login page refetched broken logos and the
 * service worker never installed on the tenant domain.
 */
import { NextRequest } from 'next/server';
import { isStaticFilePath, proxy } from '@/proxy';

function req(path: string, host = 'kuraweigh.kura.go.ke') {
  return new NextRequest(`https://${host}${path}`, { headers: { host } });
}

describe('proxy on a tenant domain', () => {
  it.each(['/truload-logo.svg', '/sw.js', '/manifest.json', '/offline.html', '/images/a/b.png'])(
    'passes %s through without a rewrite',
    async (path) => {
      const res = await proxy(req(path));
      expect(res.headers.get('x-middleware-rewrite')).toBeNull();
    }
  );

  it('still rewrites app pages to the tenant slug', async () => {
    const res = await proxy(req('/weighing/mobile'));
    expect(res.headers.get('x-middleware-rewrite')).toContain('/kura/weighing/mobile');
  });

  it('treats only a last segment with an extension as a file', () => {
    expect(isStaticFilePath('/truload-logo.svg')).toBe(true);
    expect(isStaticFilePath('/weighing/mobile')).toBe(false);
    expect(isStaticFilePath('/cases/v1.2/details')).toBe(false);
  });
});
