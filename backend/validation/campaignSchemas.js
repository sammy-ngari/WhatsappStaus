const { z } = require("zod");

// Enumerations mirror Prisma enum values.
const campaignStatusSchema = z.enum(["ACTIVE", "INACTIVE", "COMPLETED"]);
const campaignTypeSchema = z.enum(["VIDEO", "IMAGES"]);

/**
 * Campaign creation payload contract.
 * Intended for route integration in campaign endpoints.
 */
const campaignCreateSchema = z.object({
  body: z
    .object({
      title: z.array(z.unknown()).min(1),
      brand_name: z.string().trim().min(1).max(100),
      commission_rate: z.number().finite().nonnegative(),
      duration: z.number().int().positive(),
      caption: z.array(z.unknown()).min(1),
      promo_code: z.string().trim().min(1).max(50),
      material_urls: z.array(z.unknown()).min(1),
      type: campaignTypeSchema,
      unique_link: z.string().trim().url().max(255),
      status: campaignStatusSchema.optional(),
      start_date: z.coerce.date().optional(),
      end_date: z.coerce.date().optional(),
    })
    .superRefine((value, context) => {
      // Guard against invalid campaign date windows.
      if (value.start_date && value.end_date && value.end_date < value.start_date) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "end_date cannot be before start_date",
          path: ["end_date"],
        });
      }
    }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

/**
 * Minimal status update payload contract.
 */
const statusCreateSchema = z.object({
  body: z.object({
    status: campaignStatusSchema,
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

module.exports = {
  campaignCreateSchema,
  statusCreateSchema,
};
