import z from "zod/v4";

export const startUploadSchema = z.object({
    idn: z.string().optional(),
    objectName: z.string(),
    filename: z.string()
})
