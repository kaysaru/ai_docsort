import z, { base64 } from "zod/v4";

export const startUploadSchema = z.object({
    idn: z.string().optional(),
    catalogCode: z.string(),
    objectName: z.string(),
    filePath: z.string()
})