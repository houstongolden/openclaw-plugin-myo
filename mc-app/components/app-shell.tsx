"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ActivityIndicator } from "@/components/activity/activity-indicator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sun, Moon, Laptop, LayoutDashboard, FolderKanban, MessageSquare, Settings, Columns3, Activity, HeartPulse, AlarmClock, PenTool, Dna, Plug, Link2 } from "lucide-react";
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
              <NavItem href="/" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />
              <NavItem href="/activity" icon={<Activity className="h-4 w-4" />} label="Live" />
              <NavItem href="/tasks" icon={<Columns3 className="h-4 w-4" />} label="Tasks" />
              <NavItem href="/projects" icon={<FolderKanban className="h-4 w-4" />} label="Projects" />
              <NavItem href="/content" icon={<PenTool className="h-4 w-4" />} label="Content" />
              <NavItem href="/heartbeats" icon={<HeartPulse className="h-4 w-4" />} label="Heartbeats" />
              <NavItem href="/jobs" icon={<AlarmClock className="h-4 w-4" />} label="Jobs" />
              <NavItem href="/skills-dna" icon={<Dna className="h-4 w-4" />} label="Skills DNA" />
              <NavItem href="/connections" icon={<Link2 className="h-4 w-4" />} label="Connections" />
              <NavItem href="/plugins" icon={<Plug className="h-4 w-4" />} label="Plugins" />
              <NavItem href="/chat" icon={<MessageSquare className="h-4 w-4" />} label="Chat" />
              <NavItem href="/settings" icon={<Settings className="h-4 w-4" />} label="Settings" />
            </div>
            <Separator className="my-3" />
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
          </ScrollArea>
        </aside>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
