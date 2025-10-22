import { initTRPC } from "@trpc/server";
import * as trpcExpress from '@trpc/server/adapters/express'
import {catalogSchema, clientSchema, startUploadSchema, uploadDocumentSchema} from "./schemas";
import { minioClient } from "./minio";
import z from "zod/v4";
import {prisma} from "./db/db";

export const createContext = ({
    req,
    res,
}: trpcExpress.CreateExpressContextOptions) => ({})
type Context = Awaited<ReturnType<typeof createContext>>


export const t = initTRPC.context<Context>().create()

const router = t.router
export const publicProcedure = t.procedure

const bucket = 'files'

export const appRouter = router({
    greeting: publicProcedure.query(() => 'hello trpc'),
    createUser: publicProcedure
        .input(clientSchema)
        .mutation((opts) => ({ res: opts.input })),
    getUploadUrl: publicProcedure.input(uploadDocumentSchema).mutation(async (opts) => {
        const { input } = opts;
        const objectName = `${input.catalogCode}_${Date.now()}_${input.filename}`;
        const url = await minioClient.presignedPutObject(bucket, objectName)
        return { url, objectName }
    }),
    startUploadDocument: publicProcedure.input(startUploadSchema)
        .mutation(async opts => {
            await minioClient.fGetObject(bucket, opts.input.objectName, opts.input.filePath)
            // const job = await fileQueue.add('processFile', {
            //     filePath: opts.input.catalogCode
            // })
            console.log(opts.input)
            return {
                jobId: opts.input
            }
        }),
    catalogs: publicProcedure.input(z.number()).query(async ({ input }) => {
        const catalog = await prisma.catalog.findFirst({
            where: { id: input },
            include: { parent: true, children: true }
        })
        return catalogSchema.parse(catalog)
    })
})

export type AppRouter = typeof appRouter;
