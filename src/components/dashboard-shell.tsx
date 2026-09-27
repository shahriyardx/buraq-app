"use client";

import {
  Award,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Home,
  LifeBuoy,
  type LucideIcon,
  Megaphone,
  Menu,
  Receipt,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { initials } from "@/lib/format";
import type { NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  users: Users,
  "calendar-check": CalendarCheck,
  "book-open": BookOpen,
  clipboard: ClipboardList,
  award: Award,
  receipt: Receipt,
  "life-buoy": LifeBuoy,
  megaphone: Megaphone,
  shield: Shield,
  settings: Settings,
};

type ShellUser = {
  name: string;
  email: string;
  role: string;
  photoUrl?: string | null;
};

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => {
        const Icon = ICONS[item.icon] ?? Home;
        const active =
          item.href === pathname ||
          (item.href !== "/admin" &&
            item.href !== "/student" &&
            pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-6 py-5">
      <Image
        src="/brand/buraq-logo.png"
        alt="Buraq Horse Riding School"
        width={40}
        height={40}
        className="size-10 object-contain"
        priority
      />
      <div className="leading-tight">
        <p className="font-heading text-base font-semibold text-sidebar-foreground">
          Buraq
        </p>
        <p className="text-xs tracking-wide text-sidebar-foreground/60">
          Riding School
        </p>
      </div>
    </div>
  );
}

export function DashboardShell({
  nav,
  user,
  children,
}: {
  nav: NavItem[];
  user: ShellUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-sidebar lg:flex">
        <Brand />
        <div className="mt-2 flex-1 overflow-y-auto pb-4">
          <NavLinks items={nav} pathname={pathname} />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur lg:px-8">
          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Brand />
              <div className="mt-2">
                <NavLinks
                  items={nav}
                  pathname={pathname}
                  onNavigate={() => setOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>

          <div className="ml-auto flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Avatar className="size-9">
                    {user.photoUrl && (
                      <AvatarImage src={user.photoUrl} alt={user.name} />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <SignOutButton />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
