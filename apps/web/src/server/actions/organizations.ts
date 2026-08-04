'use server';

import {
  createInvitation,
  createOrganization,
  removeMember,
  revokeInvitation,
  updateMemberRole,
  updateOrganization,
} from '@atlas/core';
import { isRole, slugify } from '@atlas/types';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireOrganizationOrThrow, requireSessionOrThrow } from '../context';
import { formString, runFormAction, type FormState } from '../form';

export async function createOrganizationAction(
  _previous: FormState<void>,
  formData: FormData,
): Promise<FormState<void>> {
  let destination = '/organizations';

  const result = await runFormAction('organizations.create', async () => {
    const { user } = await requireSessionOrThrow();

    const name = formString(formData, 'name');
    const requestedSlug = formString(formData, 'slug');

    const organization = await createOrganization(user.id, {
      name,
      // An empty slug field means "derive one from the name" rather than an
      // error, so the common path is one field instead of two.
      slug: requestedSlug.length > 0 ? requestedSlug : slugify(name),
    });

    destination = `/${organization.slug}`;
  });

  if (result.status === 'error') {
    return result;
  }

  redirect(destination);
}

export async function updateOrganizationAction(
  _previous: FormState<void>,
  formData: FormData,
): Promise<FormState<void>> {
  return await runFormAction('organizations.update', async () => {
    const slug = formString(formData, 'organizationSlug');
    const { actor } = await requireOrganizationOrThrow(slug);

    await updateOrganization(actor, { name: formString(formData, 'name') });
    revalidatePath(`/${slug}/settings`);
  });
}

export interface InvitationCreated {
  readonly acceptUrl: string;
  readonly email: string;
}

export async function inviteMemberAction(
  _previous: FormState<InvitationCreated>,
  formData: FormData,
): Promise<FormState<InvitationCreated>> {
  return await runFormAction('organizations.invite', async () => {
    const slug = formString(formData, 'organizationSlug');
    const { actor } = await requireOrganizationOrThrow(slug);

    const role = formString(formData, 'role');
    if (!isRole(role)) {
      // Reaching here means the form was tampered with; the select only offers
      // valid roles.
      throw new Error(`Unrecognised role: ${role}`);
    }

    const issued = await createInvitation(actor, {
      email: formString(formData, 'email'),
      role,
    });

    revalidatePath(`/${slug}/members`);

    return { acceptUrl: issued.acceptUrl, email: issued.invitation.email };
  });
}

export async function revokeInvitationAction(
  _previous: FormState<void>,
  formData: FormData,
): Promise<FormState<void>> {
  return await runFormAction('organizations.revokeInvitation', async () => {
    const slug = formString(formData, 'organizationSlug');
    const { actor } = await requireOrganizationOrThrow(slug);

    await revokeInvitation(actor, formString(formData, 'invitationId'));
    revalidatePath(`/${slug}/members`);
  });
}

export async function updateMemberRoleAction(
  _previous: FormState<void>,
  formData: FormData,
): Promise<FormState<void>> {
  return await runFormAction('organizations.updateMemberRole', async () => {
    const slug = formString(formData, 'organizationSlug');
    const { actor } = await requireOrganizationOrThrow(slug);

    const role = formString(formData, 'role');
    if (!isRole(role)) {
      throw new Error(`Unrecognised role: ${role}`);
    }

    await updateMemberRole(actor, formString(formData, 'membershipId'), role);
    revalidatePath(`/${slug}/members`);
  });
}

export async function removeMemberAction(
  _previous: FormState<void>,
  formData: FormData,
): Promise<FormState<void>> {
  return await runFormAction('organizations.removeMember', async () => {
    const slug = formString(formData, 'organizationSlug');
    const { actor } = await requireOrganizationOrThrow(slug);

    await removeMember(actor, formString(formData, 'membershipId'));
    revalidatePath(`/${slug}/members`);
  });
}
