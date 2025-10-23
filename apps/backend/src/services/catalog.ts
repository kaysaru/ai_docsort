import {publicProcedure} from "../trpc";
import z from "zod/v4";
import {prisma} from "../db/db";
import {catalogSchema} from "../schemas";

export const catalogService = {
    catalog: publicProcedure.input(z.number()).query(async ({ input }) => {
        const catalog = await prisma.catalog.findFirst({
            where: { id: input },
            include: { parent: true, children: true }
        })
        return catalogSchema.parse(catalog)
    }),
}