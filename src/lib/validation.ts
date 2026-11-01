import { z } from "zod";
import { AGE_CATEGORIES, SANDO_SIZES } from "./constants";
import { CHURCHES, OTHER_CHURCH_CODE } from "./churches";

const churchCodes = CHURCHES.map((c) => c.code) as [string, ...string[]];
const ageCategoryIds = AGE_CATEGORIES.map((c) => c.id) as [string, ...string[]];
const sizeIds = SANDO_SIZES.map((s) => s.id) as [string, ...string[]];

export const registrationSchema = z
  .object({
    fullName: z.string().trim().min(2, "Full name is required").max(120),
    age: z
      .string()
      .trim()
      .regex(/^\d+$/, "Age must be numbers only")
      .transform((value) => Number(value))
      .pipe(z.number().int().min(5, "Age must be at least 5").max(120)),
    sex: z.enum(["MALE", "FEMALE"]),
    phone: z
      .string()
      .trim()
      .regex(/^\d{7,15}$/, "Enter a valid contact number using digits only"),
    facebook: z.string().trim().min(2, "Facebook is required").max(500),
    ageCategory: z.enum(ageCategoryIds),
    zone: z.preprocess(
      (value) => (value === "" || value === undefined || value === null ? undefined : Number(value)),
      z.number().int().min(1).max(3).optional(),
    ),
    churchCode: z.enum(churchCodes),
    otherChurchName: z.string().trim().max(120).optional().default(""),
    sandoSize: z.enum(sizeIds),
    paymentPackage: z.enum(["DISCOUNTED", "PREMIUM", "REGULAR"]),
    paymentMode: z.enum(["FULL", "CASH", "PAY_LATER"]).default("FULL"),
  })
  .superRefine((data, ctx) => {
    if (data.churchCode !== OTHER_CHURCH_CODE) {
      const church = CHURCHES.find((c) => c.code === data.churchCode);
      if (church?.zone && data.zone && Number(data.zone) !== church.zone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["churchCode"],
          message: "Selected church does not match the zone",
        });
      }
    }
    const includesSinglet = data.paymentPackage !== "REGULAR";
    if (includesSinglet && data.sandoSize === "NOT_APPLICABLE") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sandoSize"],
        message: "Please choose a sando size.",
      });
    }
    if (!includesSinglet && data.sandoSize !== "NOT_APPLICABLE") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sandoSize"],
        message: "Regular registration does not include a singlet.",
      });
    }
  });

export type RegistrationFormValues = {
  fullName: string;
  age: string;
  sex: "MALE" | "FEMALE" | "";
  phone: string;
  facebook: string;
  ageCategory: string;
  zone?: number | null;
  churchCode: string;
  sandoSize: string;
  paymentPackage: "DISCOUNTED" | "PREMIUM" | "REGULAR" | "";
  paymentMode: "FULL" | "CASH" | "PAY_LATER";
};

export function normalizeRegistrationInput(input: RegistrationFormValues) {
  const paymentPackage = input.paymentPackage;
  if (!paymentPackage) {
    return null;
  }

  const paymentMode =
    input.paymentMode === "CASH" ? "CASH" : input.paymentMode === "PAY_LATER" ? "PAY_LATER" : "FULL";

  return {
    fullName: input.fullName,
    age: input.age,
    sex: input.sex,
    phone: input.phone,
    facebook: input.facebook,
    ageCategory: input.ageCategory,
    zone: input.zone ?? undefined,
    churchCode: input.churchCode,
    sandoSize: paymentPackage === "REGULAR" ? "NOT_APPLICABLE" : input.sandoSize,
    paymentPackage,
    paymentMode,
  };
}

export function validateRegistrationInput(input: RegistrationFormValues) {
  if (!input.paymentPackage) {
    return {
      success: false as const,
      error: new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          path: ["paymentPackage"],
          message: "Please choose a registration package.",
        },
      ]),
    };
  }
  return registrationSchema.safeParse(normalizeRegistrationInput(input)!);
}

export function normalizeFullNameKey(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function registrationErrorMessage(error: z.ZodError) {
  const flat = error.flatten();
  for (const messages of Object.values(flat.fieldErrors)) {
    if (messages?.[0]) return messages[0];
  }
  if (flat.formErrors[0]) return flat.formErrors[0];
  return "Please check the form fields.";
}
