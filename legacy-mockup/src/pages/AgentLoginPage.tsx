import { PortalLogin } from "../components/PortalLogin";

export function AgentLoginPage() {
  return (
    <PortalLogin
      portal="Agent"
      title="Villa Memorial · Sales agent portal"
      email="agent@example.com"
      password="agent123"
      destination="/agent/dashboard"
    />
  );
}
