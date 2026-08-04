import { describe, expect, it } from 'vitest';

import {
  newOrganizationId,
  newUserId,
  organizationIdSchema,
  parseUserId,
  userIdSchema,
} from './ids';
import { toPage } from './pagination';
import { emailSchema, isReservedSlug, passwordSchema, slugify, slugSchema } from './primitives';
import { can, permissionsFor, ROLES } from './roles';

describe('identifiers', () => {
  it('are prefixed by entity', () => {
    expect(newUserId()).toMatch(/^usr_[0-9a-f]{32}$/);
    expect(newOrganizationId()).toMatch(/^org_[0-9a-f]{32}$/);
  });

  it('reject an identifier belonging to another entity', () => {
    // The whole point of the prefix: a user id passed where an organization id
    // is expected fails at the boundary instead of querying the wrong table.
    expect(organizationIdSchema.safeParse(newUserId()).success).toBe(false);
    expect(userIdSchema.safeParse(newOrganizationId()).success).toBe(false);
  });

  it('are time-ordered so index inserts stay sequential', () => {
    const ids = Array.from({ length: 50 }, () => newUserId());
    expect([...ids].sort()).toEqual(ids);
  });

  it('are unique', () => {
    const ids = new Set(Array.from({ length: 2000 }, () => newUserId()));
    expect(ids.size).toBe(2000);
  });

  it('reject malformed values', () => {
    expect(() => parseUserId('usr_not-hex')).toThrow();
    expect(() => parseUserId('')).toThrow();
    expect(() => parseUserId('usr_' + 'a'.repeat(31))).toThrow();
  });
});

describe('roles', () => {
  it('grants owners a superset of admin permissions', () => {
    for (const permission of permissionsFor('ADMIN')) {
      expect(can('OWNER', permission)).toBe(true);
    }
  });

  it('grants admins a superset of member permissions', () => {
    for (const permission of permissionsFor('MEMBER')) {
      expect(can('ADMIN', permission)).toBe(true);
    }
  });

  it('reserves role changes and deletion for owners', () => {
    expect(can('OWNER', 'member:update_role')).toBe(true);
    expect(can('ADMIN', 'member:update_role')).toBe(false);
    expect(can('OWNER', 'organization:delete')).toBe(true);
    expect(can('ADMIN', 'organization:delete')).toBe(false);
  });

  it('gives members read access only', () => {
    expect(permissionsFor('MEMBER')).toEqual(['organization:read', 'member:read']);
  });

  it('covers every role', () => {
    for (const role of ROLES) {
      expect(permissionsFor(role).length).toBeGreaterThan(0);
    }
  });
});

describe('email', () => {
  it('normalises case and whitespace so one address is one account', () => {
    expect(emailSchema.parse('  Person@Example.COM ')).toBe('person@example.com');
  });

  it('rejects malformed addresses', () => {
    for (const value of ['nope', 'a@', '@b.com', 'a b@c.com']) {
      expect(emailSchema.safeParse(value).success).toBe(false);
    }
  });
});

describe('password policy', () => {
  it('requires at least 12 characters', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse('a'.repeat(12)).success).toBe(true);
  });

  it('imposes no composition rules', () => {
    // NIST SP 800-63B: length, not character classes.
    expect(passwordSchema.safeParse('all lowercase words here').success).toBe(true);
  });

  it('bounds length so an unauthenticated caller cannot drive unbounded work', () => {
    expect(passwordSchema.safeParse('a'.repeat(257)).success).toBe(false);
  });
});

describe('slugs', () => {
  it('rejects values that would shadow a route', () => {
    for (const reserved of ['api', 'login', 'settings', 'admin']) {
      expect(isReservedSlug(reserved)).toBe(true);
      expect(slugSchema.safeParse(reserved).success).toBe(false);
    }
  });

  it('rejects malformed slugs', () => {
    for (const value of ['-lead', 'trail-', 'double--hyphen', 'sp ace', 'a', 'under_score']) {
      expect(slugSchema.safeParse(value).success).toBe(false);
    }
  });

  it('normalises case rather than rejecting it', () => {
    // Uppercase input is a typo, not an attack; lowercasing is friendlier than
    // an error and keeps one organization from occupying two slugs.
    expect(slugSchema.parse('  ACME-Corp ')).toBe('acme-corp');
  });

  it('derives a usable slug from a display name', () => {
    expect(slugify('Acme Corporation')).toBe('acme-corporation');
    expect(slugify('  Café  Déjà Vu!  ')).toBe('cafe-deja-vu');
    expect(slugify('Multiple   Spaces')).toBe('multiple-spaces');
  });
});

describe('pagination', () => {
  const rows = Array.from({ length: 6 }, (_, index) => ({ id: `row_${String(index)}` }));

  it('reports another page when an extra row was fetched', () => {
    const page = toPage(rows, 5);
    expect(page.data).toHaveLength(5);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe('row_4');
  });

  it('reports the end of the collection', () => {
    const page = toPage(rows.slice(0, 3), 5);
    expect(page.data).toHaveLength(3);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
  });

  it('handles an empty collection', () => {
    const page = toPage([], 5);
    expect(page.data).toHaveLength(0);
    expect(page.nextCursor).toBeNull();
  });
});
