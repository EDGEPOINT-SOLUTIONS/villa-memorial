"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, ShieldCheck, User, Users } from "lucide-react";
import { Avatar } from "@/components/portal/avatar";

/**
 * The account block — the owner's picture and name at the top right (plan §7.6,
 * the captain's 2026-09-30 addition).
 *
 * ONE IDENTITY, TWO PLACES. The chip and the drawer block read the SAME account
 * (the account owner's name and picture). The chip is a real control: a
 * `aria-haspopup="menu"` button that opens a small menu (Your details · Your
 * family · Privacy Center · Sign out), closes on Escape (returning focus to the
 * button) and on a click outside, and moves focus into the menu on open.
 *
 * The picture is the family's own upload from the guarded store
 * (`/api/family/images/avatar`); until one exists the initials disc is the
 * complete, honest state — never a placeholder face. On a phone the chip is the
 * avatar only (the name lives in the drawer's account block).
 */
export type PortalAccount = {
  name: string;
  email: string | null;
  initials: string;
  /** The guarded avatar URL, when a picture exists. */
  avatarSrc?: string | null;
  profileTo: string;
  familyTo?: string;
  privacyTo?: string;
  logoutTo: string;
};

export function AccountChip({
  account,
  variant = "desktop",
}: {
  account: PortalAccount;
  variant?: "desktop" | "phone";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapper = useRef<HTMLDivElement | null>(null);
  const button = useRef<HTMLButtonElement | null>(null);
  const menu = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        button.current?.focus();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const items = Array.from(
        menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
      );
      if (items.length === 0) return;
      event.preventDefault();
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next =
        event.key === "ArrowDown"
          ? items[(index + 1 + items.length) % items.length]
          : items[(index - 1 + items.length) % items.length];
      next.focus();
    };
    const onPointer = (event: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace(account.logoutTo);
  }

  const itemClass = "account-menu__item";

  return (
    <div
      className={`account-chip account-chip--${variant}`}
      ref={wrapper}
      data-open={open ? "yes" : "no"}
    >
      <button
        type="button"
        ref={button}
        className="account-chip__button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Your account — ${account.name}`}
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar
          src={account.avatarSrc}
          initials={account.initials}
          size={variant === "phone" ? 32 : 34}
        />
        {variant === "desktop" ? (
          <>
            <span className="account-chip__name">{account.name}</span>
            <ChevronDown size={16} aria-hidden="true" />
          </>
        ) : null}
      </button>

      {open ? (
        <div className="account-menu" role="menu" aria-label="Your account" ref={menu}>
          {variant === "desktop" && account.email ? (
            <p className="account-menu__email">{account.email}</p>
          ) : null}
          <Link
            role="menuitem"
            href={account.profileTo}
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            <User size={16} aria-hidden="true" /> Your details
          </Link>
          {account.familyTo ? (
            <Link
              role="menuitem"
              href={account.familyTo}
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              <Users size={16} aria-hidden="true" /> Your family
            </Link>
          ) : null}
          {account.privacyTo ? (
            <Link
              role="menuitem"
              href={account.privacyTo}
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              <ShieldCheck size={16} aria-hidden="true" /> Privacy Center
            </Link>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={signOut}
            disabled={busy}
          >
            <LogOut size={16} aria-hidden="true" /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** The drawer's account block — the same identity, at full width, with a name. */
export function AccountBlock({ account }: { account: PortalAccount }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="account-block">
      <div className="account-block__identity">
        <Avatar src={account.avatarSrc} initials={account.initials} size={40} />
        <div>
          <p className="account-block__name">{account.name}</p>
          {account.email ? <p className="account-block__email">{account.email}</p> : null}
        </div>
      </div>
      <nav className="account-block__links" aria-label="Your account">
        <Link href={account.profileTo}>Your details</Link>
        {account.familyTo ? <Link href={account.familyTo}>Your family</Link> : null}
        {account.privacyTo ? <Link href={account.privacyTo}>Privacy Center</Link> : null}
      </nav>
      <button
        type="button"
        className="portal-sidebar__logout"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
          router.replace(account.logoutTo);
        }}
      >
        <LogOut size={18} aria-hidden="true" />
        Log Out
      </button>
    </div>
  );
}
