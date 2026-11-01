import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CHURCHES, OTHER_SLOT_START, OVERFLOW_COUNTER } from "../src/lib/churches";
import { normalizeFullNameKey } from "../src/lib/validation";

const prisma = new PrismaClient();

async function main() {
  const legacyOther = await prisma.church.findUnique({ where: { code: "000" } });
  if (legacyOther) {
    const legacyCount = await prisma.registration.count({ where: { churchCode: "000" } });
    if (legacyCount === 0) {
      await prisma.churchCounter.deleteMany({ where: { churchCode: "000" } });
      await prisma.church.delete({ where: { code: "000" } });
    }
  }

  for (const church of CHURCHES) {
    await prisma.church.upsert({
      where: { code: church.code },
      update: {
        name: church.name,
        zone: church.zone,
        estimatedQuota: church.estimatedQuota,
        slotStart: church.slotStart,
        sortOrder: church.sortOrder,
      },
      create: church,
    });

    const issued = await prisma.registration.count({ where: { churchCode: church.code } });
    const initialSequence = church.slotStart - 1;
    await prisma.churchCounter.upsert({
      where: { churchCode: church.code },
      update: issued === 0 ? { lastSequence: initialSequence } : {},
      create: { churchCode: church.code, lastSequence: initialSequence },
    });
  }

  const overflowIssued = await prisma.registration.count({ where: { sequence: { gte: OTHER_SLOT_START } } });
  await prisma.sequenceCounter.upsert({
    where: { name: OVERFLOW_COUNTER },
    update: overflowIssued === 0 ? { lastSequence: OTHER_SLOT_START - 1 } : {},
    create: { name: OVERFLOW_COUNTER, lastSequence: OTHER_SLOT_START - 1 },
  });

  const email = (process.env.ADMIN_EMAIL ?? "tickets.agos2026@gmail.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "CWM-tickets.com";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.admin.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  const premiumEndsAt = new Date("2026-11-14T23:59:00+08:00");
  const regularEndsAt = new Date("2026-11-30T23:59:00+08:00");
  const payLaterEndsAt = new Date("2026-11-14T23:59:00+08:00");

  const existingSettings = await prisma.eventSettings.findUnique({ where: { id: "default" } });
  await prisma.eventSettings.upsert({
    where: { id: "default" },
    update: {
      premiumEnabled: existingSettings?.premiumEnabled ?? true,
      regularEnabled: existingSettings?.regularEnabled ?? true,
      payLaterEnabled: existingSettings?.payLaterEnabled ?? true,
      premiumEndsAt: existingSettings?.premiumEndsAt ?? premiumEndsAt,
      regularEndsAt: existingSettings?.regularEndsAt ?? regularEndsAt,
      payLaterEndsAt: existingSettings?.payLaterEndsAt ?? payLaterEndsAt,
    },
    create: {
      id: "default",
      discountedEnabled: true,
      registrationEnabled: true,
      premiumEnabled: true,
      regularEnabled: true,
      payLaterEnabled: true,
      premiumEndsAt,
      regularEndsAt,
      payLaterEndsAt,
    },
  });

  const unnamed = await prisma.registration.findMany({
    where: { fullNameKey: null },
    select: { id: true, fullName: true },
  });
  const usedKeys = new Set(
    (await prisma.registration.findMany({ where: { fullNameKey: { not: null } }, select: { fullNameKey: true } })).map(
      (row) => row.fullNameKey,
    ),
  );
  for (const row of unnamed) {
    const key = normalizeFullNameKey(row.fullName);
    if (!key || usedKeys.has(key)) continue;
    await prisma.registration.update({ where: { id: row.id }, data: { fullNameKey: key } });
    usedKeys.add(key);
  }

  console.log(`Seeded ${CHURCHES.length} churches and admin ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
