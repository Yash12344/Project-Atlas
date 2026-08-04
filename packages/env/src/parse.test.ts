import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { EnvironmentValidationError, parseEnv } from './parse';

const schema = z.object({
  REQUIRED: z.string().min(1),
  PORT: z.coerce.number().int().positive(),
  OPTIONAL: z.string().default('fallback'),
});

describe('environment validation', () => {
  it('parses and coerces a valid environment', () => {
    const parsed = parseEnv('test', schema, { REQUIRED: 'value', PORT: '8080' });
    expect(parsed).toEqual({ REQUIRED: 'value', PORT: 8080, OPTIONAL: 'fallback' });
  });

  it('reports every problem at once rather than one per restart', () => {
    // A container that fails on the first missing variable forces the operator
    // through one redeploy per mistake.
    try {
      parseEnv('test', schema, {});
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvironmentValidationError);
      const issues = (error as EnvironmentValidationError).issues;
      expect(issues).toHaveLength(2);
      expect(issues.join('\n')).toContain('REQUIRED');
      expect(issues.join('\n')).toContain('PORT');
    }
  });

  it('names the offending variable in the message', () => {
    expect(() => parseEnv('server', schema, { REQUIRED: 'ok', PORT: 'not-a-number' })).toThrow(
      /PORT/,
    );
  });
});
