"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ActivityIndicator } from "@/components/activity/activity-indicator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Laptop, Activity, FolderKanban, Users, Library, User, Settings } from "lucide-react";
import { useTheme } from "next-themes";

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={
        "flex items-center gap-2 rounded-xl px-3 py-2 text-sm " +
        (active ? "bg-primary text-primary-foreground" : "hover:bg-muted")
      }
    >
      <span className="opacity-90">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}

function ThemeToggle() {
  const { setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Laptop className="mr-2 h-4 w-4" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-[280px_1fr]">
        <aside className="border-r">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500" />
              <div>
                <div className="text-sm font-semibold leading-none">Mission Control</div>
                <div className="text-xs text-muted-foreground">Local OpenClaw OS</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <ActivityIndicator />
              <ThemeToggle />
            </div>
          </div>
          <Separator />
          <ScrollArea className="h-[calc(100vh-58px)] px-3 py-3">
            <div className="space-y-1">
              <NavItem href="/you" icon={<User className="h-4 w-4" />} label="You" />
              <NavItem href="/live" icon={<Activity className="h-4 w-4" />} label="Live" />
              <NavItem href="/projects" icon={<FolderKanban className="h-4 w-4" />} label="Projects" />
              <NavItem href="/team" icon={<Users className="h-4 w-4" />} label="Team" />
              <NavItem href="/vault" icon={<Library className="h-4 w-4" />} label="Vault" />
            </div>

            <Separator className="my-4" />

            <div className="text-xs font-medium text-muted-foreground">Pinned</div>
            <div className="mt-2 space-y-1">
              <Link href="/projects/inbox" className="block rounded-xl px-3 py-2 text-sm hover:bg-muted">
                Inbox
              </Link>
              <Link href="/projects/myo-ai" className="block rounded-xl px-3 py-2 text-sm hover:bg-muted">
                Myo.ai
              </Link>
              <Link href="/projects/fitness" className="block rounded-xl px-3 py-2 text-sm hover:bg-muted">
                Fitness
              </Link>
            </div>

            <div className="mt-4">
              <Separator className="my-3" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left hover:bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500" />
                      <div>
                        <div className="text-sm font-semibold leading-none">Houston</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">Owner</div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">Menu</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/you">
                      <User className="mr-2 h-4 w-4" /> You
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" /> Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/vault">
                      <Library className="mr-2 h-4 w-4" /> Open vault
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </ScrollArea>
        </aside>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
