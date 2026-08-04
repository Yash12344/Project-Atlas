import { expect, test, type Page } from '@playwright/test';

/**
 * The signup-to-invitation path, driven through the real UI against a
 * production build.
 *
 * This is the one flow where a regression is unrecoverable for a new customer:
 * if signup or organization creation breaks, nobody can start using Atlas at
 * all. Everything below it is covered by the integration tests in
 * packages/core, which are faster and more precise.
 */

function unique(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

const PASSWORD = 'a-sufficiently-long-password';

async function signUp(page: Page, suffix: string): Promise<string> {
  const email = `e2e-${suffix}@example.test`;

  await page.goto('/signup');
  await page.getByLabel('Full name').fill(`E2E ${suffix}`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  return email;
}

test('a new user can sign up, create an organization, and invite a teammate', async ({ page }) => {
  const suffix = unique();
  await signUp(page, suffix);

  // --- Create the first organization ---------------------------------------
  const slug = `e2e-${suffix}`;
  await page.getByLabel('Organization name').fill(`E2E ${suffix} Ltd`);
  await expect(page.getByLabel('URL slug')).toHaveValue(/e2e/);
  await page.getByLabel('URL slug').fill(slug);
  await page.getByRole('button', { name: 'Create organization' }).click();

  await expect(page).toHaveURL(new RegExp(`/${slug}$`));
  await expect(page.getByRole('heading', { name: `E2E ${suffix} Ltd` })).toBeVisible();
  // The creator is the owner.
  await expect(page.getByText('owner').first()).toBeVisible();

  // --- Invite someone ------------------------------------------------------
  await page.getByRole('link', { name: 'Members' }).click();
  await expect(page).toHaveURL(new RegExp(`/${slug}/members$`));

  const inviteeEmail = `invitee-${suffix}@example.test`;
  await page.getByLabel('Email').fill(inviteeEmail);
  await page.getByRole('button', { name: 'Send invite' }).click();

  // The acceptance link is surfaced because Atlas does not send email yet.
  const link = page.getByText(/\/invitations\//);
  await expect(link).toBeVisible();
  const acceptUrl = (await link.textContent()) ?? '';
  expect(acceptUrl).toContain('/invitations/');

  await expect(page.getByRole('cell', { name: inviteeEmail })).toBeVisible();
});

test('an invitation cannot be accepted by the wrong account', async ({ page }) => {
  const ownerSuffix = unique();
  await signUp(page, ownerSuffix);

  const slug = `e2e-${ownerSuffix}`;
  await page.getByLabel('Organization name').fill(`E2E ${ownerSuffix} Ltd`);
  await page.getByLabel('URL slug').fill(slug);
  await page.getByRole('button', { name: 'Create organization' }).click();
  await expect(page).toHaveURL(new RegExp(`/${slug}$`));

  await page.goto(`/${slug}/members`);
  const inviteeEmail = `invitee-${unique()}@example.test`;
  await page.getByLabel('Email').fill(inviteeEmail);
  await page.getByRole('button', { name: 'Send invite' }).click();

  const acceptUrl = (await page.getByText(/\/invitations\//).textContent()) ?? '';
  const path = new URL(acceptUrl).pathname;

  // The owner — signed in, but not the invited address — must be refused.
  await page.goto(path);
  await expect(page.getByText(/signed in as/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accept invitation' })).toBeDisabled();
});

test('signing out ends the session', async ({ page }) => {
  const suffix = unique();
  await signUp(page, suffix);

  const slug = `e2e-${suffix}`;
  await page.getByLabel('Organization name').fill(`E2E ${suffix} Ltd`);
  await page.getByLabel('URL slug').fill(slug);
  await page.getByRole('button', { name: 'Create organization' }).click();
  await expect(page).toHaveURL(new RegExp(`/${slug}$`));

  await page.getByRole('button', { name: 'Account menu' }).click();
  // The control is a menuitem, not a button: `asChild` merges Radix's
  // role="menuitem" onto the submit button, which is the correct semantics for
  // something inside a menu.
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);

  // The protected route must no longer be reachable.
  await page.goto(`/${slug}`);
  await expect(page).toHaveURL(/\/login/);
});
