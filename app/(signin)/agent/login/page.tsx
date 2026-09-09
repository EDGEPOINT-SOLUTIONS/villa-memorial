import { SignInCard } from "@/components/sign-in-card";

export const metadata = { title: "Agent sign-in — Villa Memorial" };

export default function AgentLoginPage() {
  return (
    <SignInCard
      door="agent"
      fallbackDestination="/agent/dashboard"
      personas={[{ email: "agent@vm.demo", display_name: "Alex Agent" }]}
    />
  );
}
