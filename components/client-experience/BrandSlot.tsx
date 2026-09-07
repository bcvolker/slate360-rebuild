import { brandInitials, brandMarkAlt, type ProjectBrand } from "@/lib/spatial-experience/brand";
import { SlateLogo } from "@/components/shared/SlateLogo";

/**
 * One brand slot for every client surface.
 *
 * Paid default: small Slate360 mark + dominant client identity (logo, else name).
 * No client identity: Slate360 alone. White-label: client only; Slate360 lives
 * in "Powered by" (see MoreMenu). Initials are only ever a fallback for a
 * named client, with the name exposed to assistive tech.
 */
export function BrandSlot({ brand, compact = false }: { brand: ProjectBrand; compact?: boolean }) {
  const hasLogo = Boolean(brand.clientLogoUrl);
  const hasName = Boolean(brand.clientDisplayName);
  const client = hasLogo ? (
    <img src={brand.clientLogoUrl!} alt={brandMarkAlt(brand)} className="ce-brand__client" data-testid="client-logo" />
  ) : hasName ? (
    compact ? <ClientInitials brand={brand} /> : <span className="ce-brand__client-name" title={brand.clientDisplayName!}>{brand.clientDisplayName}</span>
  ) : null;

  if (brand.whiteLabel && client) {
    return <span className="ce-brand" data-testid="brand-slot" data-brand="white-label">{client}</span>;
  }
  if (!client) {
    return (
      <span className="ce-brand" data-testid="brand-slot" data-brand="slate360">
        <span className="ce-brand__slate" aria-label="Slate360"><SlateLogo size="sm" /></span>
      </span>
    );
  }
  return (
    <span className="ce-brand" data-testid="brand-slot" data-brand="paid">
      <span className="ce-brand__slate ce-brand__slate--small ce-brand__slate--hide-mobile" aria-label="Slate360"><SlateLogo size="sm" /></span>
      <span className="ce-brand__sep ce-brand__slate--hide-mobile" aria-hidden="true" />
      {client}
    </span>
  );
}

function ClientInitials({ brand }: { brand: ProjectBrand }) {
  const ini = brandInitials(brand);
  if (!ini) return null;
  return (
    <span className="ce-brand__initials" role="img" aria-label={ini.label} title={ini.label}>{ini.letters}</span>
  );
}
