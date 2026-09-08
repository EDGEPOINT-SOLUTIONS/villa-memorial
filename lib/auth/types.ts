/** UI-facing session view. Never exposes raw tokens. */
export type Session = {
  userId: string;
  tenantId: string;
  scopes: string[];
  email: string;
  displayName: string;
  /** ISO timestamp of access-token expiry (BFF refreshes before this). */
  expiresAt: string;
};

/** `user` object returned by identity-access login (User#as_safe_json). */
export type SafeUser = {
  id: string;
  tenant_id: string;
  email: string;
  display_name: string;
};
