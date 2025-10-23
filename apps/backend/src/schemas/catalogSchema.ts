import { z } from "zod/v4";

export const catalogBaseSchema = z.object({
    id: z.number(),
    name: z.string(),
    code: z.string(),
    parentId: z.number().nullable(),
})

export const catalogSchema = z.lazy(() =>
    catalogBaseSchema.extend({
        parent: catalogBaseSchema.nullable(),
        children: z.array(catalogBaseSchema),
    })
)

export type Catalog = z.infer<typeof catalogSchema>