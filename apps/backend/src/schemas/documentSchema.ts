import z from "zod/v4";

export const documentSchema = z.object({
    name: z.string(),
    catalogId: z.number(),
    fileId: z.number(),
    reference: z.string(),
    clientId: z.number(),
    metadata: z.record(z.string(), z.string())
})

export type Document = z.infer<typeof documentSchema>