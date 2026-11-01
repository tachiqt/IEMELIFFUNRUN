export const EVENT = {
  name: "AGOS Family Run 2026",
  hostedBy: "Hosted by IEMELIF District IV-East Committee on Ways and Means",
  welcome: "Welcome to AGOS 2026 Family Run!",
  tagline:
    "Join us as we run together as one family, one run, and one AGOS. Let’s come together in faith, fellowship, and purpose as we take every step toward a meaningful cause.",
  dateLabel: "NOVEMBER 30, 2026",
  location: "MARBELLA LAKE RESIDENCES VICTORIA, LAGUNA",
  hashtag: "#COWAMD4E_AGOS2026",
};

export const EARLY_BIRD_HIDE_AT = 100;
export const EARLY_BIRD_CAP = 100;

export const PAYMENT_PACKAGES = {
  DISCOUNTED: {
    id: "DISCOUNTED" as const,
    amount: 500,
    label: "Discounted",
    shortLabel: "DISCOUNTED — PAY ₱500",
    description: "Race bib, singlet, and a chance at a finisher medal. First 100 registrants.",
    icon: "/images/500option.png",
    banner: "/images/500.png",
    includesSinglet: true,
  },
  PREMIUM: {
    id: "PREMIUM" as const,
    amount: 550,
    label: "Premium",
    shortLabel: "PREMIUM — PAY ₱550",
    description: "Race bib, singlet, and a chance at a finisher medal.",
    icon: "/images/550option.png",
    banner: "/images/550.png",
    includesSinglet: true,
  },
  REGULAR: {
    id: "REGULAR" as const,
    amount: 350,
    label: "Regular",
    shortLabel: "REGULAR — PAY ₱350",
    description: "Race bib only. Please wear your own white shirt.",
    icon: "/images/350option.png",
    banner: "/images/350.png",
    includesSinglet: false,
  },
};

export const AGE_CATEGORIES = [
  { id: "KIDS", label: "Kids (5–12 years old)" },
  { id: "YOUTH", label: "Youth (13–30 years old)" },
  { id: "YOUNG_ADULTS", label: "Young Adults (31–35 years old)" },
  { id: "ADULTS", label: "Adults (36–59 years old)" },
  { id: "SENIOR", label: "Senior (60–Above years old)" },
] as const;

export const SANDO_SIZES = [
  { id: "XXS", label: "XXS" },
  { id: "XS", label: "XS" },
  { id: "S", label: "S" },
  { id: "M", label: "M" },
  { id: "L", label: "L" },
  { id: "XL", label: "XL" },
  { id: "XXL", label: "XXL" },
  { id: "XXXL", label: "3XL" },
  { id: "NOT_APPLICABLE", label: "Not Applicable (Regular)" },
] as const;

export const PAYMENT_STATUSES = [
  { id: "PENDING", label: "Pending" },
  { id: "VALID", label: "Valid" },
  { id: "DENIED", label: "Denied" },
] as const;

export const SOCIAL = {
  adminFacebook:
    "https://www.facebook.com/people/Cowam-Adminn/pfbid02u112nTQ19m8SQzWWcg6P8B46EoTprButKpjVeRXGrjfzF3ExQ8Rv3XLrA6w66D9fl/",
  officialFacebook: "https://www.facebook.com/people/COWAM-D4e/61563476956656/",
  mapQuery: "58WR+697, Victoria, Laguna",
  mapLat: 14.216272,
  mapLng: 121.345761,
  mapEmbed:
    "https://maps.google.com/maps?q=14.216272,121.345761&z=16&output=embed",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=14.216272,121.345761",
} as const;

export const MAX_PROOF_BYTES = 10 * 1024 * 1024;
export const ALLOWED_PROOF_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

export const STATUS_PATH = "/status";

export const PAYMENT_BANNERS = {
  ini: "/images/inipayment.png",
  fin: "/images/finpayment.png",
} as const;
export const PUBLIC_TICKET_ID_PATTERN = /^[0-9]{3}-[0-9]+$/;

/** Digits only, then auto-insert dash after the 3-digit church code (e.g. 101001 → 101-001). */
export function formatPublicTicketIdInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 12);
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
}

export function sanitizePublicTicketId(value: string) {
  return formatPublicTicketIdInput(value);
}

export function normalizePublicTicketId(value: string) {
  return formatPublicTicketIdInput(value.trim());
}

export function isPublicTicketId(value: string) {
  return PUBLIC_TICKET_ID_PATTERN.test(normalizePublicTicketId(value));
}

export function registrationPaymentBanner(packageId: keyof typeof PAYMENT_PACKAGES) {
  return PAYMENT_PACKAGES[packageId].banner;
}

export function formatTicketId(churchCode: string, sequence: number) {
  const width = sequence > 999 ? String(sequence).length : 3;
  return `${churchCode}-${String(sequence).padStart(width, "0")}`;
}
