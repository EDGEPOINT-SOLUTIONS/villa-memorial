/**
 * Family sign-in scope — the family door of the shared sign-in card gets the
 * sky-blue, larger-type treatment of the approved family design
 * (docs/08-delivery/family-portal-design) without changing the staff or agent
 * doors: the scope class only reaches `.signin-*` inside this layout.
 */
export default function ClientSignInLayout({ children }: { children: React.ReactNode }) {
  return <div className="fv-signin-scope">{children}</div>;
}
