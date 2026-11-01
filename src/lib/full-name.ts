import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeFullNameKey } from "@/lib/validation";

type NameLookup = { id: string; ticketId: string };

export async function findRegistrationByFullName(
  name: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<NameLookup | null> {
  const key = normalizeFullNameKey(name);
  if (key.length < 2) return null;

  const byKey = await client.registration.findUnique({
    where: { fullNameKey: key },
    select: { id: true, ticketId: true },
  });
  if (byKey) return byKey;

  const rows = await client.$queryRaw<NameLookup[]>`
    SELECT id, ticket_id AS "ticketId"
    FROM registrations
    WHERE lower(regexp_replace(trim(full_name), '\\s+', ' ', 'g')) = ${key}
    LIMIT 1
  `;
  return rows[0] ?? null;
}
