import { listMembers, listPendingInvitations } from '@atlas/core';
import { can } from '@atlas/types';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@atlas/ui';
import type { Metadata } from 'next';

import { InviteMemberForm } from './invite-member-form';
import { MemberActions } from './member-actions';
import { RevokeInvitationButton } from './revoke-invitation-button';
import { requireOrganization } from '~/server/context';

export const metadata: Metadata = { title: 'Members' };

interface PageProps {
  readonly params: Promise<{ readonly orgSlug: string }>;
}

export default async function MembersPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const { actor } = await requireOrganization(orgSlug);

  const members = await listMembers(actor);
  const invitations = can(actor.role, 'invitation:read') ? await listPendingInvitations(actor) : [];

  const canInvite = can(actor.role, 'member:invite');
  const canManage = can(actor.role, 'member:remove') || can(actor.role, 'member:update_role');

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <p className="text-sm text-muted-foreground">People with access to this organization.</p>
      </div>

      {canInvite ? <InviteMemberForm organizationSlug={orgSlug} actorRole={actor.role} /> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team</CardTitle>
          <CardDescription>{members.data.length} member(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.data.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell className="text-muted-foreground">{member.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{member.role.toLowerCase()}</Badge>
                  </TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      <MemberActions
                        organizationSlug={orgSlug}
                        membershipId={member.id}
                        memberRole={member.role}
                        actorRole={actor.role}
                        isSelf={member.userId === actor.userId}
                      />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {invitations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending invitations</CardTitle>
            <CardDescription>Not yet accepted.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{invitation.role.toLowerCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invitation.expiresAt.toISOString().slice(0, 10)}
                    </TableCell>
                    <TableCell className="text-right">
                      <RevokeInvitationButton
                        organizationSlug={orgSlug}
                        invitationId={invitation.id}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
