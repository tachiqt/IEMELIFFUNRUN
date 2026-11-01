export type Church = {
  code: string;
  name: string;
  zone: number | null;
  estimatedQuota: number;
  slotStart: number;
  sortOrder: number;
};

export const CHURCHES: Church[] = [
  { code: "101", name: "Santa Rosa", zone: 1, estimatedQuota: 80, slotStart: 1, sortOrder: 1 },
  { code: "102", name: "Mal-cab", zone: 1, estimatedQuota: 20, slotStart: 81, sortOrder: 2 },
  { code: "103", name: "Calamba & San Isidro", zone: 1, estimatedQuota: 20, slotStart: 101, sortOrder: 3 },
  { code: "104", name: "Canlubang", zone: 1, estimatedQuota: 20, slotStart: 121, sortOrder: 4 },
  { code: "105", name: "Majada-in", zone: 1, estimatedQuota: 15, slotStart: 141, sortOrder: 5 },
  { code: "206", name: "San Pablo", zone: 2, estimatedQuota: 30, slotStart: 156, sortOrder: 6 },
  { code: "207", name: "Imok", zone: 2, estimatedQuota: 30, slotStart: 186, sortOrder: 7 },
  { code: "208", name: "Wind Valley", zone: 2, estimatedQuota: 15, slotStart: 216, sortOrder: 8 },
  { code: "209", name: "Hanggan", zone: 2, estimatedQuota: 10, slotStart: 231, sortOrder: 9 },
  { code: "210", name: "Pila", zone: 2, estimatedQuota: 10, slotStart: 241, sortOrder: 10 },
  { code: "211", name: "Pagsanjan", zone: 2, estimatedQuota: 30, slotStart: 251, sortOrder: 11 },
  { code: "212", name: "Cansuso", zone: 2, estimatedQuota: 5, slotStart: 281, sortOrder: 12 },
  { code: "213", name: "Luisiana", zone: 2, estimatedQuota: 10, slotStart: 286, sortOrder: 13 },
  { code: "214", name: "Liyang", zone: 2, estimatedQuota: 10, slotStart: 296, sortOrder: 14 },
  { code: "315", name: "San Antonio", zone: 3, estimatedQuota: 80, slotStart: 306, sortOrder: 15 },
  { code: "316", name: "Bukal, Tiaong", zone: 3, estimatedQuota: 10, slotStart: 386, sortOrder: 16 },
  { code: "317", name: "Baybayin", zone: 3, estimatedQuota: 20, slotStart: 396, sortOrder: 17 },
  { code: "318", name: "Lipa", zone: 3, estimatedQuota: 30, slotStart: 416, sortOrder: 18 },
  { code: "319", name: "Mahabang Parang", zone: 3, estimatedQuota: 80, slotStart: 446, sortOrder: 19 },
  { code: "320", name: "Boot Tanauan", zone: 3, estimatedQuota: 10, slotStart: 526, sortOrder: 20 },
  { code: "321", name: "Sariaya", zone: 3, estimatedQuota: 5, slotStart: 536, sortOrder: 21 },
  { code: "022", name: "Guest Participant", zone: null, estimatedQuota: 0, slotStart: 541, sortOrder: 99 },
];

export const ZONES = [
  { id: 1, label: "Zone 1" },
  { id: 2, label: "Zone 2" },
  { id: 3, label: "Zone 3" },
] as const;

export const OTHER_CHURCH_CODE = "022";
export const OTHER_CHURCH_LABEL = "Guest Participant";
export const OTHER_SLOT_START = 541;
export const OVERFLOW_COUNTER = "overflow";

export function reservedEnd(church: Church) {
  if (church.code === OTHER_CHURCH_CODE || church.estimatedQuota <= 0) {
    return OTHER_SLOT_START - 1;
  }
  return church.slotStart + church.estimatedQuota - 1;
}

export function churchesInZone(zone: number) {
  return CHURCHES.filter((c) => c.zone === zone);
}

export function findChurch(code: string) {
  return CHURCHES.find((c) => c.code === code);
}

export function churchDisplayName(code: string, otherName?: string | null) {
  if (code === OTHER_CHURCH_CODE) {
    return otherName?.trim() ? `${OTHER_CHURCH_LABEL} — ${otherName.trim()}` : OTHER_CHURCH_LABEL;
  }
  return findChurch(code)?.name ?? code;
}

export function reservedRangeLabel(church: Church) {
  const pad = (n: number) => String(n).padStart(3, "0");
  if (church.code === OTHER_CHURCH_CODE) {
    return "022-541, 022-542, … (shared overflow)";
  }
  const end = church.slotStart + church.estimatedQuota - 1;
  return `${church.code}-${pad(church.slotStart)} – ${church.code}-${pad(end)}, then shared ${church.code}-541+`;
}
