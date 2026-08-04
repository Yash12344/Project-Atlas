'use client';

import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  initials,
} from '@atlas/ui';
import type { Role } from '@atlas/types';
import Link from 'next/link';

import { logoutAction, switchOrganizationAction } from '~/server/actions/auth';

interface OrganizationNavProps {
  readonly organization: { readonly name: string; readonly slug: string };
  readonly organizations: readonly { readonly name: string; readonly slug: string }[];
  readonly user: { readonly name: string; readonly email: string };
  readonly role: Role;
}

export function OrganizationNav({ organization, organizations, user, role }: OrganizationNavProps) {
  const others = organizations.filter((item) => item.slug !== organization.slug);

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href={`/${organization.slug}`} className="font-semibold tracking-tight">
            {organization.name}
          </Link>
          <Badge variant="outline">{role.toLowerCase()}</Badge>
        </div>

        <nav className="flex items-center gap-1" aria-label="Organization">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${organization.slug}`}>Overview</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${organization.slug}/members`}>Members</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${organization.slug}/settings`}>Settings</Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Account menu">
                <Avatar>
                  <AvatarFallback>{initials(user.name)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="block truncate font-medium">{user.name}</span>
                <span className="block truncate text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {others.length > 0 ? (
                <>
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    Switch organization
                  </DropdownMenuLabel>
                  {others.map((item) => (
                    /*
                     * A form rather than a link: switching mutates the
                     * session's active organization, and a GET that changes
                     * state is prefetchable and CSRF-able.
                     *
                     * The form wraps the item, and `onSelect` is prevented:
                     * Radix closes the menu on select, which unmounts the
                     * button before the browser dispatches its submit. That
                     * silently did nothing — caught by the sign-out e2e test.
                     */
                    <form key={item.slug} action={switchOrganizationAction}>
                      <input type="hidden" name="slug" value={item.slug} />
                      <DropdownMenuItem
                        asChild
                        onSelect={(event) => {
                          event.preventDefault();
                        }}
                      >
                        <button type="submit" className="w-full truncate text-left">
                          {item.name}
                        </button>
                      </DropdownMenuItem>
                    </form>
                  ))}
                  <DropdownMenuSeparator />
                </>
              ) : null}

              <DropdownMenuItem asChild>
                <Link href="/organizations">All organizations</Link>
              </DropdownMenuItem>
              <form action={logoutAction}>
                <DropdownMenuItem
                  asChild
                  onSelect={(event) => {
                    event.preventDefault();
                  }}
                >
                  <button type="submit" className="w-full text-left">
                    Sign out
                  </button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
