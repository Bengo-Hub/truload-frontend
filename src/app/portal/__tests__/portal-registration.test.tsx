/**
 * Smoke tests: Portal registration link-transporter form validation.
 */

describe('Link transporter form validation', () => {
  function validateLinkIdentifier(
    identifierType: 'email' | 'phone' | 'code',
    value: string
  ): { valid: boolean; error?: string } {
    if (!value.trim()) return { valid: false, error: 'Value is required' };

    if (identifierType === 'email') {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      return ok ? { valid: true } : { valid: false, error: 'Invalid email address' };
    }

    if (identifierType === 'phone') {
      const ok = /^\+?\d{9,15}$/.test(value.replace(/\s/g, ''));
      return ok ? { valid: true } : { valid: false, error: 'Invalid phone number' };
    }

    // transporter code — 3–20 alphanumeric chars
    const ok = /^[A-Z0-9]{3,20}$/i.test(value);
    return ok ? { valid: true } : { valid: false, error: 'Invalid transporter code' };
  }

  it('accepts a valid email identifier', () => {
    const result = validateLinkIdentifier('email', 'transport@example.com');
    expect(result.valid).toBe(true);
  });

  it('rejects an invalid email identifier', () => {
    const result = validateLinkIdentifier('email', 'not-an-email');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid email address');
  });

  it('accepts a valid phone number', () => {
    const result = validateLinkIdentifier('phone', '+254712345678');
    expect(result.valid).toBe(true);
  });

  it('rejects too-short phone number', () => {
    const result = validateLinkIdentifier('phone', '123');
    expect(result.valid).toBe(false);
  });

  it('accepts a valid transporter code', () => {
    const result = validateLinkIdentifier('code', 'KURA001');
    expect(result.valid).toBe(true);
  });

  it('rejects an empty identifier', () => {
    const result = validateLinkIdentifier('email', '   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Value is required');
  });
});
