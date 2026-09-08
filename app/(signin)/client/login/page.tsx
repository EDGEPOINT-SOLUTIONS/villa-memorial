import { SignInCard } from "@/components/sign-in-card";

export const metadata = { title: "Family sign-in — In Memoriam" };

export default function FamilyLoginPage() {
  return (
    <SignInCard
      door="family"
      fallbackDestination="/client/dashboard"
      personas={[{ email: "customer@vm.demo", display_name: "Cory Customer" }]}
    />
  );
}
