import z from "zod/v4";

export const uploadDocumentSchema = z.object({
    catalogCode: z.string(),
    filename: z.string()
})