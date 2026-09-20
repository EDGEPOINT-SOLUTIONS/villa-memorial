/**
 * The Tenant settings screen's data (S32) — composed entirely from records the
 * product actually holds.
 *
 * No new fixture: the identity rows come from the landing content document the
 * public chrome publishes (edited at `/staff/landing`), the configured rates
 * from the pricing document (edited at `/staff/pricing`), the catalogue row
 * from the durable catalogue store, and the business rules from
 * `lib/tenant-settings.ts` — every value read from the module that enforces it.
 *
 * `tenancy-config` is not in this build, so the screen names that once and
 * stays read-only. Nothing here provisions, writes or defaults a setting.
 */
import { getChapelAdminView } from "@/lib/api-client/chapel-admin";
import { listCatalogRecords } from "@/lib/api-client/catalog-store";
import { listLandingContent } from "@/lib/api-client/landing";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import {
  BUSINESS_RULES,
  PLATFORM_ONLY,
  type BusinessRule,
  type ConfigurationRow,
  type PlatformOnlyItem,
} from "@/lib/tenant-settings";

export type IdentityRow = {
  key: string;
  label: string;
  /** What the app publishes right now; an empty value prints as "Not set". */
  value: string;
  /** A `tel:` link when the row is a phone line. */
  href: string | null;
};

export type TenantSettingsView = {
  identity: IdentityRow[];
  rules: ReadonlyArray<BusinessRule>;
  configuration: ConfigurationRow[];
  platformOnly: ReadonlyArray<PlatformOnlyItem>;
};

/** A recorded instant as a stable calendar day (fixture-safe, no locale). */
function dayOf(instant: string | null): string | null {
  if (!instant) return null;
  const day = instant.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

function editedBasis(
  updatedAt: string | null,
  fallback: string,
  by?: string | null,
): string {
  const day = dayOf(updatedAt);
  if (!day) return fallback;
  return by ? `edited ${day} by ${by}` : `edited in the app ${day}`;
}

/** The identity the public chrome prints, straight from the landing document. */
function identityRows(content: Awaited<ReturnType<typeof listLandingContent>>): IdentityRow[] {
  return [
    { key: "name", label: "Park name", value: content.logo.wordmark, href: null },
    {
      key: "phone",
      label: content.contact.phoneLabel || "Main line",
      value: content.contact.phoneDisplay,
      href: content.contact.phoneHref || null,
    },
    {
      key: "second-phone",
      label: "Second line",
      value: content.contact.secondPhoneDisplay,
      href: content.contact.secondPhoneHref || null,
    },
    { key: "office", label: "Main office", value: content.contact.officeAddress, href: null },
    { key: "park", label: "Park address", value: content.contact.parkAddress, href: null },
    { key: "location", label: "Location", value: content.contact.location, href: null },
  ];
}

/** Everything the office configures, and everything still waiting on a service. */
async function configurationRows(): Promise<ConfigurationRow[]> {
  const [content, pricing, catalog, chapels] = await Promise.all([
    listLandingContent(),
    loadPricingDocument(),
    listCatalogRecords(),
    getChapelAdminView(),
  ]);

  const published = catalog.filter((item) => item.published).length;

  return [
    {
      key: "identity",
      setting: "Park identity & contact lines",
      state: "configured",
      basis: editedBasis(
        content.updated_at,
        "the recorded seed, not yet edited in the app",
      ),
    },
    {
      key: "rates",
      setting: "Plan rates & lot prices",
      state: "configured",
      basis: editedBasis(
        pricing.updated_at,
        "recorded from the client's 2026 sheets",
        pricing.updated_by,
      ),
    },
    {
      key: "catalog",
      setting: "Catalogue & storefront items",
      state: "configured",
      basis: `${catalog.length} items, ${published} published`,
    },
    {
      key: "chapels",
      setting: "Chapel list",
      state: "placeholder",
      basis: `The client has not confirmed the park's chapel names, count or classes (${chapels.chapels.length} recorded rows on the schedule).`,
    },
    {
      key: "workflows",
      setting: "Workflows & owners",
      state: "waiting",
      basis: "The workflow engine that would define steps and owners is not built.",
    },
    {
      key: "people",
      setting: "People & roles",
      state: "waiting",
      basis: "identity-access publishes no user-list or provisioning API.",
    },
    {
      key: "modules",
      setting: "Modules & terminology",
      state: "not_readable",
      basis: "tenancy-config is not in this build, so its flags cannot be read.",
    },
  ];
}

/** The whole screen's data. */
export async function loadTenantSettingsView(): Promise<TenantSettingsView> {
  const [content, configuration] = await Promise.all([
    listLandingContent(),
    configurationRows(),
  ]);
  return {
    identity: identityRows(content),
    rules: BUSINESS_RULES,
    configuration,
    platformOnly: PLATFORM_ONLY,
  };
}
