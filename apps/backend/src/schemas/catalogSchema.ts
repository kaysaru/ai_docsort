import { z } from "zod/v4";

export const catalogSchema = z.object({
    id: z.number(),
    name: z.number(),
    code: z.number(),
    parentId: z.number().nullable(),
    children: z.array(z.any()),
})

export type Catalog = z.infer<typeof catalogSchema>