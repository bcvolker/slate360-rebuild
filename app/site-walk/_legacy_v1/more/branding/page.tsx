import { BrandingClient } from "./BrandingClient";

export const metadata = {
  title: "Organization Branding — Site Walk",
};

export default function OrgBrandingPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Organization Branding</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize how your deliverables and reports appear to clients.
        </p>
      </div>
      <BrandingClient />
    </div>
  );
}
