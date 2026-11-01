import { RegistrationWizard } from "@/components/RegistrationWizard";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const migrationUrl = process.env.LEGACY_REDIRECT_URL?.trim() || undefined;
  return (
    <main className="min-h-screen w-full">
      <RegistrationWizard migrationUrl={migrationUrl} />
    </main>
  );
}
