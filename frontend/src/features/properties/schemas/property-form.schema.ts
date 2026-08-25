import { z } from "zod";
import { PROPERTY_TYPES } from "../types/property.types";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const optionalEmail = z
  .string()
  .trim()
  .max(254, "Email must be 254 characters or fewer.")
  .refine(
    (value) => value === "" || z.email().safeParse(value).success,
    "Enter a valid email address.",
  );

const optionalWebsite = z
  .string()
  .trim()
  .max(500, "Website must be 500 characters or fewer.")
  .refine(
    (value) =>
      value === "" ||
      (z.url().safeParse(value).success && /^https?:\/\//i.test(value)),
    "Enter a complete http:// or https:// URL.",
  );

const optionalNumber = (label: string, minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .refine(
      (value) => value === "" || Number.isFinite(Number(value)),
      `${label} must be a number.`,
    )
    .refine(
      (value) =>
        value === "" || (Number(value) >= minimum && Number(value) <= maximum),
      `${label} must be between ${minimum} and ${maximum}.`,
    );

export const openingHourFormSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    isClosed: z.boolean(),
    is24Hours: z.boolean(),
    openTime: z.string(),
    closeTime: z.string(),
  })
  .superRefine((value, context) => {
    if (value.isClosed && value.is24Hours) {
      context.addIssue({
        code: "custom",
        path: ["is24Hours"],
        message: "A day cannot be closed and open 24 hours.",
      });
    }

    if (!value.isClosed && !value.is24Hours) {
      if (!TIME_PATTERN.test(value.openTime)) {
        context.addIssue({
          code: "custom",
          path: ["openTime"],
          message: "Enter an opening time.",
        });
      }
      if (!TIME_PATTERN.test(value.closeTime)) {
        context.addIssue({
          code: "custom",
          path: ["closeTime"],
          message: "Enter a closing time.",
        });
      }
      if (
        TIME_PATTERN.test(value.openTime) &&
        TIME_PATTERN.test(value.closeTime) &&
        value.openTime >= value.closeTime
      ) {
        context.addIssue({
          code: "custom",
          path: ["closeTime"],
          message: "Closing time must be later than opening time.",
        });
      }
    }
  });

export const propertyFormSchema = z.object({
  propertyType: z.union([z.enum(PROPERTY_TYPES), z.literal("")]),
  name: z.string().trim().max(160, "Name must be 160 characters or fewer."),
  organisation: z
    .string()
    .trim()
    .max(160, "Organisation must be 160 characters or fewer."),
  description: z
    .string()
    .trim()
    .max(5_000, "Description must be 5,000 characters or fewer."),
  amenityCodes: z.array(z.string()).max(20),
  accessNotes: z
    .string()
    .trim()
    .max(2_000, "Access notes must be 2,000 characters or fewer."),
  isFree: z.boolean(),
  feeLkr: optionalNumber("Fee", 0, 99_999_999.99),
  phone: z.string().trim().max(30, "Phone must be 30 characters or fewer."),
  email: optionalEmail,
  website: optionalWebsite,
  address: z
    .string()
    .trim()
    .max(300, "Address must be 300 characters or fewer."),
  district: z
    .string()
    .trim()
    .max(100, "District must be 100 characters or fewer."),
  city: z.string().trim().max(100, "City must be 100 characters or fewer."),
  latitude: optionalNumber("Latitude", -90, 90),
  longitude: optionalNumber("Longitude", -180, 180),
  openingHours: z.array(openingHourFormSchema).max(7),
});

export type PropertyFormValues = z.infer<typeof propertyFormSchema>;

export const propertySubmissionSchema = propertyFormSchema.superRefine(
  (value, context) => {
    const requiredText = (
      field: keyof PropertyFormValues,
      label: string,
      minimumLength = 1,
    ) => {
      const fieldValue = value[field];

      if (
        typeof fieldValue !== "string" ||
        fieldValue.trim().length < minimumLength
      ) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: `${label} is required.`,
        });
      }
    };

    requiredText("propertyType", "Property type");
    requiredText("name", "Property name", 2);
    requiredText("description", "A detailed description", 50);
    requiredText("address", "Address");
    requiredText("district", "District", 2);
    requiredText("city", "City", 2);
    requiredText("latitude", "Latitude");
    requiredText("longitude", "Longitude");

    if (!value.isFree && (!value.feeLkr || Number(value.feeLkr) <= 0)) {
      context.addIssue({
        code: "custom",
        path: ["feeLkr"],
        message: "Enter a positive LKR fee for a paid property.",
      });
    }
    if (
      value.accessNotes.trim().length < 10 &&
      value.openingHours.length === 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["accessNotes"],
        message: "Add access notes or at least one opening-hours entry.",
      });
    }
    if (value.amenityCodes.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["amenityCodes"],
        message: "Select at least one amenity.",
      });
    }

    const weekdays = value.openingHours.map((entry) => entry.weekday);
    if (new Set(weekdays).size !== weekdays.length) {
      context.addIssue({
        code: "custom",
        path: ["openingHours"],
        message: "Each weekday can appear only once.",
      });
    }
  },
);
