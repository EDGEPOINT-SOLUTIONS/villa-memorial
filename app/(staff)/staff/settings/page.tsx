import { gatedSectionPage } from "../gated-section";

export const metadata = { title: "Settings — Staff Portal" };

export default function SettingsPage() {
  return gatedSectionPage(
    "Settings",
    "Administration",
    ["tenancy:tenants:manage"],
    "Tenant settings (module flags, terminology, branding) read from tenancy-config; module-flag reads are frozen and land here first, with branding/config following the config-engine freeze.",
  );
}
