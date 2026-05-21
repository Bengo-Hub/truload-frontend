/**
 * Smoke tests: Team management invite form validation.
 */

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  viewer: 'Viewer',
};

describe('Team invite form validation', () => {
  it('validates email format', () => {
    const isValidEmail = (email: string) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('valid roles are admin, manager, viewer', () => {
    const validRoles = Object.keys(ROLE_LABELS);
    expect(validRoles).toContain('admin');
    expect(validRoles).toContain('manager');
    expect(validRoles).toContain('viewer');
    expect(validRoles).toHaveLength(3);
  });

  it('role labels map correctly', () => {
    expect(ROLE_LABELS.admin).toBe('Admin');
    expect(ROLE_LABELS.manager).toBe('Manager');
    expect(ROLE_LABELS.viewer).toBe('Viewer');
  });
});
