import type { ReactNode } from 'react';

import { cn } from '../lib/cn';
import { Label } from './label';

export interface FieldProps {
  readonly id: string;
  readonly label: string;
  readonly error?: string | undefined;
  readonly hint?: string | undefined;
  readonly children: ReactNode;
  readonly className?: string | undefined;
}

/**
 * Pairs a label, a control, and its error message with the wiring that makes
 * the association real for assistive technology.
 *
 * Doing this by hand at each call site is where `aria-describedby` gets
 * forgotten: the error is then visible to sighted users and invisible to a
 * screen reader. Centralising it means the correct markup is the default.
 */
export function Field({ id, label, error, hint, children, className }: FieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={cn('grid gap-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint !== undefined && error === undefined ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error !== undefined ? (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Props a control must spread to be described by its Field. */
export function fieldControlProps(id: string, error?: string, hint?: string) {
  const describedBy = [
    error !== undefined ? `${id}-error` : undefined,
    hint !== undefined && error === undefined ? `${id}-hint` : undefined,
  ].filter((value): value is string => value !== undefined);

  return {
    id,
    'aria-invalid': error !== undefined,
    ...(describedBy.length > 0 ? { 'aria-describedby': describedBy.join(' ') } : {}),
  } as const;
}
