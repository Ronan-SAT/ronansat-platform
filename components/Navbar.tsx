"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { BarChart2, BookOpen, LibraryBig, LogOut, Settings, Target, Trophy } from "lucide-react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (pathname.startsWith("/auth")) {
    return null;
  }

  if (
    status === "loading" ||
    status === "unauthenticated" ||
    !session ||
    pathname.startsWith("/test/") ||
    pathname === "/auth"
  ) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Link href="/full-length" className="flex items-center gap-2">
            <span className="text-xl font-bold text-slate-900 transition hover:text-blue-600">Ronan SAT</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {session.user.role === "admin" ? (
            <NavItem href="/admin" active={pathname === "/admin"} icon={<Settings className="h-4 w-4" />} label="Admin" />
          ) : null}

          <NavItem
            href="/full-length"
            active={pathname === "/full-length"}
            icon={<BookOpen className="h-4 w-4" />}
            label="Full-length tests"
          />

          <NavItem
            href="/sectional"
            active={pathname === "/sectional"}
            icon={<Target className="h-4 w-4" />}
            label="Sectional tests"
          />

          <NavItem
            href="/review"
            active={pathname === "/review"}
            icon={<BarChart2 className="h-4 w-4" />}
            label="Review Mistakes"
          />

          <NavItem
            href="/vocab"
            active={pathname === "/vocab"}
            icon={<LibraryBig className="h-4 w-4" />}
            label="Vocab"
          />

          <NavItem
            href="/hall-of-fame"
            active={pathname === "/hall-of-fame"}
            icon={<Trophy className="h-4 w-4" />}
            label="Hall of Fame"
          />

          <NavItem
            href="/settings"
            active={pathname === "/settings"}
            icon={<Settings className="h-4 w-4" />}
            label="Settings"
          />

          <div className="mx-2 h-6 w-px bg-slate-200" />

          <span className="hidden text-sm font-medium text-slate-700 sm:block">
            Hi, {session.user.name || session.user.email?.split("@")[0]}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/auth" })}
            className="cursor-pointer rounded-full p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
            title="Log out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </nav>
  );
}

function NavItem({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1 text-sm font-medium transition hover:text-blue-600 ${
        active ? "text-blue-600" : "text-slate-600"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
