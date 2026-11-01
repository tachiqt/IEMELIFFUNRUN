import { notFound } from "next/navigation";
import { SuccessView } from "@/components/SuccessView";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  if (!id) notFound();

  const registration = await prisma.registration.findFirst({
    where: { ticketId: { equals: id, mode: "insensitive" } },
  });

  if (!registration) notFound();

  return (
    <SuccessView
      firstName={registration.fullName.split(" ")[0]}
      ticketId={registration.ticketId}
      churchCode={registration.churchCode}
      otherChurchName={registration.otherChurchName}
    />
  );
}
