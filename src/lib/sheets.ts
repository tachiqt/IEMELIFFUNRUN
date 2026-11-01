import { SignJWT, importPKCS8 } from "jose";
import { AGE_CATEGORIES, PAYMENT_PACKAGES, SANDO_SIZES } from "@/lib/constants";
import { churchDisplayName, findChurch } from "@/lib/churches";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const TAB_NAME = process.env.GOOGLE_SHEETS_TAB || "Registrations";

export const SHEET_HEADERS = [
  "Timestamp",
  "Ticket ID",
  "Full Name",
  "Age",
  "Biological Sex",
  "Phone Number",
  "Facebook",
  "Category",
  "Zone",
  "Local Congregation",
  "Church Code",
  "Sando Size",
  "Package",
  "Amount",
  "Payment Proof",
] as const;

type RegistrationRow = {
  ticketId: string;
  fullName: string;
  age: number;
  sex: "MALE" | "FEMALE" | string;
  phone: string;
  facebook: string;
  ageCategory: string;
  churchCode: string;
  otherChurchName?: string | null;
  sandoSize: string;
  paymentPackage: keyof typeof PAYMENT_PACKAGES | string;
  amount: number;
  createdAt: Date;
};

let cachedToken: { accessToken: string; expiresAt: number } | null = null;
let headerReady = false;

function spreadsheetId() {
  return process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim() || "";
}

type SheetsCredentials =
  | { type: "service_account"; email: string; privateKey: string }
  | { type: "authorized_user"; clientId: string; clientSecret: string; refreshToken: string };

function parseJsonEnv(raw: string) {
  return JSON.parse(raw) as Record<string, string | undefined>;
}

function credentials(): SheetsCredentials | null {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    const parsed = parseJsonEnv(json);
    if (parsed.client_email && parsed.private_key) {
      return {
        type: "service_account",
        email: parsed.client_email,
        privateKey: parsed.private_key.replace(/\\n/g, "\n"),
      };
    }
    if (parsed.client_id && parsed.client_secret && parsed.refresh_token) {
      return {
        type: "authorized_user",
        clientId: parsed.client_id,
        clientSecret: parsed.client_secret,
        refreshToken: parsed.refresh_token,
      };
    }
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (email && privateKey) {
    return { type: "service_account", email, privateKey };
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim();
  if (clientId && clientSecret && refreshToken) {
    return { type: "authorized_user", clientId, clientSecret, refreshToken };
  }
  return null;
}

function webhookUrl() {
  return process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim() || "";
}

export function sheetsConfigured() {
  return Boolean(webhookUrl() || (spreadsheetId() && credentials()));
}

async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }
  const creds = credentials();
  if (!creds) throw new Error("Google Sheets credentials are missing");

  const body =
    creds.type === "service_account"
      ? new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: await new SignJWT({ scope: SHEETS_SCOPE })
            .setProtectedHeader({ alg: "RS256", typ: "JWT" })
            .setIssuer(creds.email)
            .setAudience(TOKEN_URL)
            .setIssuedAt()
            .setExpirationTime("1h")
            .sign(await importPKCS8(creds.privateKey, "RS256")),
        })
      : new URLSearchParams({
          grant_type: "refresh_token",
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
          refresh_token: creds.refreshToken,
        });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error || "Could not get Google access token");
  }
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.accessToken;
}

async function sheetsFetch(path: string, init?: RequestInit) {
  const token = await accessToken();
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as { error?: { message?: string } }).error?.message || `Sheets API ${res.status}`;
    throw new Error(message);
  }
  return data;
}

async function ensureTabAndHeaders() {
  if (headerReady) return;
  const meta = (await sheetsFetch("?fields=sheets.properties.title")) as {
    sheets?: Array<{ properties?: { title?: string } }>;
  };
  const titles = (meta.sheets ?? []).map((sheet) => sheet.properties?.title).filter(Boolean) as string[];
  if (!titles.includes(TAB_NAME)) {
    await sheetsFetch(":batchUpdate", {
      method: "POST",
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: TAB_NAME } } }],
      }),
    });
  }

  const range = encodeURIComponent(`${TAB_NAME}!A1:O1`);
  const existing = (await sheetsFetch(`/values/${range}`)) as { values?: string[][] };
  const first = existing.values?.[0]?.[0];
  if (first !== SHEET_HEADERS[0]) {
    await sheetsFetch(`/values/${range}?valueInputOption=RAW`, {
      method: "PUT",
      body: JSON.stringify({ values: [SHEET_HEADERS] }),
    });
  }
  headerReady = true;
}

function labelFor<T extends { id: string; label: string }>(items: readonly T[], id: string) {
  return items.find((item) => item.id === id)?.label ?? id;
}

function zoneLabel(churchCode: string) {
  const church = findChurch(churchCode);
  return church?.zone ? `Zone ${church.zone}` : "Guest Participant";
}

function packageLabel(id: string) {
  const pkg = PAYMENT_PACKAGES[id as keyof typeof PAYMENT_PACKAGES];
  return pkg ? `${pkg.label} — ₱${pkg.amount}` : id;
}

function manilaTimestamp(date: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function rowValues(row: RegistrationRow) {
  return [
    manilaTimestamp(row.createdAt),
    row.ticketId,
    row.fullName,
    String(row.age),
    row.sex === "MALE" ? "Male" : row.sex === "FEMALE" ? "Female" : row.sex,
    row.phone,
    row.facebook,
    labelFor(AGE_CATEGORIES, row.ageCategory),
    zoneLabel(row.churchCode),
    churchDisplayName(row.churchCode, row.otherChurchName),
    row.churchCode,
    labelFor(SANDO_SIZES, row.sandoSize),
    packageLabel(row.paymentPackage),
    row.amount,
    "Uploaded",
  ];
}

export async function appendRegistrationToSheet(row: RegistrationRow) {
  if (!sheetsConfigured()) {
    console.warn("Google Sheets is not configured; skipping sync");
    return;
  }
  const webhook = webhookUrl();
  if (webhook) {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headers: [...SHEET_HEADERS], row: rowValues(row) }),
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`Sheets webhook ${res.status}`);
    }
    return;
  }
  await ensureTabAndHeaders();
  const range = encodeURIComponent(`${TAB_NAME}!A:O`);
  await sheetsFetch(`/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: JSON.stringify({ values: [rowValues(row)] }),
  });
}
