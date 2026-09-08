import { SignInCard } from "@/components/sign-in-card";

export const metadata = { title: "Sign in — In Memoriam" };

export default function LoginPage() {
  return (
    <SignInCard
      door="staff"
      fallbackDestination="/staff/dashboard"
      personas={[
        { email: "admin@vm.demo", display_name: "Ada Admin" },
        { email: "staff@vm.demo", display_name: "Sam Staff" },
      ]}
    />
  );
}
