import z from "zod/v4";

export const clientSchema = z.object({
    id: z.number(),
    idn: z.string(),
    clientCode: z.string(),
})

export type Client = z.infer<typeof clientSchema>