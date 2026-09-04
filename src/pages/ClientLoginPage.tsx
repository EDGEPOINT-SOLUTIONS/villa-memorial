import { PortalLogin } from "../components/PortalLogin";

export function ClientLoginPage() {
  return (
    <PortalLogin
      portal="Family"
      title="Villa Memorial · Family portal"
      email="family@example.com"
      password="family123"
      destination="/client/dashboard"
    />
  );
}
