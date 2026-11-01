import { Prisma } from "@prisma/client";
import { OTHER_CHURCH_CODE, OTHER_SLOT_START, OVERFLOW_COUNTER, reservedEnd, type Church } from "@/lib/churches";

type Tx = Prisma.TransactionClient;

async function firstUnusedSequence(tx: Tx, start: number, end: number) {
  if (end < start) return null;
  const rows = await tx.$queryRaw<Array<{ n: number }>>`
    SELECT s.n
    FROM generate_series(${start}::int, ${end}::int) AS s(n)
    WHERE NOT EXISTS (
      SELECT 1 FROM registrations r WHERE r.sequence = s.n
    )
    ORDER BY s.n
    LIMIT 1
  `;
  return rows[0]?.n ?? null;
}

async function nextOverflowSequence(tx: Tx) {
  await tx.$executeRaw`
    INSERT INTO sequence_counters (name, last_sequence)
    VALUES (${OVERFLOW_COUNTER}, ${OTHER_SLOT_START - 1})
    ON CONFLICT (name) DO NOTHING
  `;
  await tx.$queryRaw`
    SELECT last_sequence FROM sequence_counters
    WHERE name = ${OVERFLOW_COUNTER}
    FOR UPDATE
  `;

  const capRows = await tx.$queryRaw<Array<{ cap: number }>>`
    SELECT GREATEST(
      COALESCE((SELECT MAX(sequence) FROM registrations WHERE sequence >= ${OTHER_SLOT_START}), ${OTHER_SLOT_START - 1}),
      COALESCE((SELECT last_sequence FROM sequence_counters WHERE name = ${OVERFLOW_COUNTER}), ${OTHER_SLOT_START - 1})
    ) + 1 AS cap
  `;
  const cap = capRows[0]?.cap ?? OTHER_SLOT_START;
  const sequence = (await firstUnusedSequence(tx, OTHER_SLOT_START, cap)) ?? cap;

  await tx.$executeRaw`
    UPDATE sequence_counters
    SET last_sequence = GREATEST(last_sequence, ${sequence})
    WHERE name = ${OVERFLOW_COUNTER}
  `;
  return sequence;
}

export async function nextTicketSequence(tx: Tx, church: Church) {
  const usesReserved = church.code !== OTHER_CHURCH_CODE && church.estimatedQuota > 0;
  const end = reservedEnd(church);

  if (!usesReserved) {
    return nextOverflowSequence(tx);
  }

  await tx.$executeRaw`
    INSERT INTO church_counters (church_code, last_sequence)
    VALUES (${church.code}, ${church.slotStart - 1})
    ON CONFLICT (church_code) DO NOTHING
  `;
  await tx.$queryRaw`
    SELECT last_sequence FROM church_counters
    WHERE church_code = ${church.code}
    FOR UPDATE
  `;

  const sequence = await firstUnusedSequence(tx, church.slotStart, end);
  if (!sequence) {
    return nextOverflowSequence(tx);
  }

  await tx.$executeRaw`
    UPDATE church_counters
    SET last_sequence = GREATEST(last_sequence, ${sequence})
    WHERE church_code = ${church.code}
  `;
  return sequence;
}
