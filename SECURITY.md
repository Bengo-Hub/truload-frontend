# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| 0.1.x   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in TruLoad Frontend, please report it by emailing:

**security@truload.example.com** (or contact repository maintainers privately)

Include the following information:

- **Type of vulnerability** (e.g., XSS, CSRF, authentication bypass)
- **Full paths** of source files related to the vulnerability
- **Location** of the affected code (tag/branch/commit or direct URL)
- **Step-by-step instructions** to reproduce the issue
- **Proof-of-concept or exploit code** (if possible)
- **Impact** of the vulnerability
- **Suggested fix** (if you have one)

### What to Expect

- **Acknowledgment**: Within 48 hours of report submission
- **Initial Assessment**: Within 5 business days
- **Regular Updates**: Every 7 days until resolved
- **Resolution**: Timeline depends on severity and complexity
- **Credit**: Public acknowledgment in CHANGELOG (unless you prefer anonymity)

## Security Best Practices

### For Contributors

#### 1. Authentication & Authorization

- **Never store tokens in localStorage** (use httpOnly cookies)
- **Implement route protection** via middleware
- **Validate permissions** before rendering UI elements
- **Clear auth state** on logout
- **Handle token expiration** gracefully
- **Redirect to login** on 401 responses

```typescript
// ✅ Good: Middleware-based route protection
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  
  if (!token && !isPublicRoute(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// ❌ Bad: No route protection
```

#### 2. XSS Prevention

- **Sanitize user input** before rendering
- **Use React's built-in XSS protection** (avoid dangerouslySetInnerHTML)
- **Validate data from API** before display
- **Use Content Security Policy** headers
- **Escape user content** in rich text editors

```typescript
// ✅ Good: React automatically escapes
<div>{userInput}</div>

// ⚠️ Dangerous: Only use with sanitized content
<div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />

// ✅ Better: Use a sanitization library
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(dirtyHtml);
<div dangerouslySetInnerHTML={{ __html: clean }} />
```

#### 3. CSRF Protection

- **Use SameSite cookies** for authentication
- **Implement CSRF tokens** for forms (backend handles this)
- **Validate Origin/Referer headers** (backend)
- **Use POST for mutations** (not GET)

```typescript
// Next.js automatically includes CSRF protection
// Just ensure you're using appropriate HTTP methods

// ✅ Good: POST for mutations
const createWeighing = async (data: CreateWeighingData) => {
  return apiClient.post('/api/v1/weighings', data);
};

// ❌ Bad: GET for mutations
const deleteWeighing = async (id: string) => {
  return apiClient.get(`/api/v1/weighings/${id}/delete`);
};
```

#### 4. Environment Variables & Secrets

- **Never commit `.env.local`** to repository
- **Use `NEXT_PUBLIC_` prefix** for client-side variables only
- **Keep API keys server-side** (use API routes)
- **Validate environment variables** at build time

```typescript
// ✅ Good: Client-side public variables
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// ✅ Good: Server-side secret (API routes or server components only)
const apiSecret = process.env.API_SECRET;

// ❌ Bad: Secret without NEXT_PUBLIC_ exposed to client
const secret = process.env.SECRET_KEY; // Still visible in client bundle!
```

#### 5. Dependency Management

- **Keep dependencies updated** (security patches)
- **Review npm packages** before installing
- **Monitor for vulnerabilities** (npm audit, Dependabot)
- **Use lockfiles** (pnpm-lock.yaml)
- **Audit transitive dependencies**

```bash
# Check for vulnerabilities
pnpm audit

# Update packages
pnpm update

# Fix vulnerabilities
pnpm audit --fix
```

#### 6. API Client Security

- **Use HTTPS only** in production
- **Validate SSL certificates**
- **Implement request timeouts**
- **Handle errors gracefully**
- **Don't expose error details** to users

```typescript
// lib/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  withCredentials: true, // Send httpOnly cookies
  validateStatus: (status) => status < 500, // Don't throw on 4xx
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // ✅ Good: Generic error for user
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    
    // ✅ Good: Log details server-side
    console.error('API Error:', error);
    
    // ❌ Bad: Expose error to user
    // alert(error.message);
    
    return Promise.reject(error);
  }
);
```

#### 7. Input Validation

- **Validate on client AND server** (client for UX, server for security)
- **Use Zod or similar** for schema validation
- **Sanitize file uploads**
- **Limit input lengths**
- **Validate file types and sizes**

```typescript
import { z } from 'zod';

// ✅ Good: Input validation
const weighingSchema = z.object({
  vehicleRegistration: z
    .string()
    .min(1, 'Required')
    .max(20, 'Too long')
    .regex(/^[A-Z0-9\s]+$/, 'Invalid format'),
  mode: z.enum(['static', 'wim', 'axle']),
  stationId: z.string().uuid(),
});

// Use in form
const form = useForm({
  resolver: zodResolver(weighingSchema),
});
```

#### 8. Offline Security

- **Encrypt sensitive data** in IndexedDB
- **Clear queue on logout**
- **Validate data** before sync
- **Use idempotency keys** to prevent duplicates
- **Implement conflict resolution**

```typescript
// ✅ Good: Clear offline data on logout
export async function clearOfflineData() {
  const db = new OfflineQueueDB();
  await db.mutations.clear();
  await db.delete(); // Delete entire database
}

// Call on logout
export function logout() {
  clearAuthState();
  clearOfflineData();
  window.location.href = '/login';
}
```

#### 9. Content Security Policy

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self';
      connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL};
      frame-ancestors 'none';
    `.replace(/\s{2,}/g, ' ').trim()
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

#### 10. Logging & Monitoring

- **Don't log sensitive data** (tokens, passwords, PII)
- **Log authentication attempts**
- **Monitor console errors** in production
- **Implement error tracking** (Sentry, etc.)
- **Track security events**

```typescript
// ✅ Good: Safe logging
console.log('User logged in:', { userId: user.id });

// ❌ Bad: Logging sensitive data
console.log('User credentials:', { email, password, token });
```

## Security Features

### Implemented

- ✅ Next.js 15 with built-in security features
- ✅ Middleware-based route protection
- ✅ httpOnly cookies for authentication tokens
- ✅ HTTPS enforcement (production)
- ✅ Client-side input validation
- ✅ React's built-in XSS protection
- ✅ Environment variable validation
- ✅ Offline data encryption (planned)
- ✅ Error boundary for graceful failures

### Planned

- ⏳ Content Security Policy headers
- ⏳ Subresource Integrity (SRI) for CDN resources
- ⏳ Rate limiting on client side
- ⏳ Bot detection and prevention
- ⏳ Security headers middleware
- ⏳ Automated security scanning in CI/CD
- ⏳ Penetration testing
- ⏳ Session management improvements

## Common Vulnerabilities & Mitigations

### Cross-Site Scripting (XSS)

**Risk**: Malicious scripts executed in user's browser

**Mitigation**:
- React automatically escapes content
- Avoid dangerouslySetInnerHTML
- Sanitize rich text with DOMPurify
- Use Content Security Policy

### Cross-Site Request Forgery (CSRF)

**Risk**: Unauthorized actions on behalf of user

**Mitigation**:
- SameSite cookies
- CSRF tokens (backend)
- POST for mutations
- Validate Origin headers

### Sensitive Data Exposure

**Risk**: Tokens/secrets exposed to client

**Mitigation**:
- httpOnly cookies for tokens
- Server-side secrets only
- HTTPS in production
- Don't log sensitive data

### Broken Authentication

**Risk**: Unauthorized access

**Mitigation**:
- Middleware route protection
- Token validation on every request
- Clear auth on logout
- Handle token expiration

### Insecure Deserialization

**Risk**: Malicious data from API

**Mitigation**:
- Validate API responses
- Type-check with TypeScript
- Use Zod schemas
- Don't eval() user input

### Using Components with Known Vulnerabilities

**Risk**: Outdated dependencies with security flaws

**Mitigation**:
- Regular dependency updates
- npm audit / pnpm audit
- Dependabot alerts
- Review before installing

### Insufficient Logging & Monitoring

**Risk**: Security incidents undetected

**Mitigation**:
- Error tracking (Sentry)
- Log authentication events
- Monitor console errors
- Analytics for anomalies

## Security Checklist for PRs

Before submitting a PR, ensure:

- [ ] No secrets or API keys committed
- [ ] No `.env.local` committed
- [ ] Environment variables use correct prefix
- [ ] Protected routes have auth checks
- [ ] User input is validated
- [ ] No dangerouslySetInnerHTML without sanitization
- [ ] No sensitive data in logs/console
- [ ] Dependencies are up to date
- [ ] Security implications documented
- [ ] Tests cover security scenarios

## Incident Response

In case of a security incident:

1. **Contain**: Take affected systems offline if needed
2. **Assess**: Determine scope and impact
3. **Notify**: Contact security team immediately
4. **Document**: Record all details
5. **Patch**: Develop and deploy fix
6. **Review**: Conduct post-incident analysis
7. **Communicate**: Notify affected users (if applicable)

## Compliance

TruLoad Frontend handles weighing enforcement data and must comply with:

- **Data Protection**: Personal data handling (GDPR principles)
- **Accessibility**: WCAG 2.1 Level AA compliance
- **Browser Security**: Modern security standards
- **Offline Data**: Secure storage and sync

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [React Security Best Practices](https://react.dev/learn/escape-hatches#avoiding-xss-attacks)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)

## Contact

For security concerns, contact:
- **Email**: security@truload.example.com
- **Maintainers**: [See CODEOWNERS]

---

**Last Updated**: February 2, 2026

This security policy is subject to change. Please check regularly for updates.
