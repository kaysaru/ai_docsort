import { initTRPC } from "@trpc/server";
import * as trpcExpress from '@trpc/server/adapters/express'
import {catalogSchema, clientSchema, startUploadSchema, uploadDocumentSchema} from "./schemas";
import { minioClient } from "./minio";
import z from "zod/v4";
import {prisma} from "./db/db";
import { fileQueue } from "./redis";

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
            const { objectName, filename, idn } = opts.input;
            
            // Use a temporary "personal" catalog for initial upload
            // The worker will reassign to correct catalog after ML classification
            const tempCatalog = await prisma.catalog.findFirst({
                where: { code: 'personal' }
            });
            
            if (!tempCatalog) {
                throw new Error('Default catalog not found. Please run seed script.');
            }
            
            // Create document record with temporary catalog
            const document = await prisma.document.create({
                data: {
                    filename,
                    objectName,
                    catalogId: tempCatalog.id,
                    idn,
                    status: 'pending'
                }
            });
            
            // Queue job for processing (OCR + ML + auto-catalog assignment)
            const job = await fileQueue.add('processFile', {
                documentId: document.id,
                objectName
            });
            
            // Update document with job ID
            await prisma.document.update({
                where: { id: document.id },
                data: { jobId: job.id }
            });
            
            console.log(`Document ${document.id} created and job ${job.id} queued for auto-classification`);
            
            return {
                documentId: document.id,
                jobId: job.id,
                status: 'pending'
            }
        }),
    getDocumentStatus: publicProcedure
        .input(z.object({ documentId: z.number() }))
        .query(async ({ input }) => {
            const document = await prisma.document.findUnique({
                where: { id: input.documentId },
                include: { catalog: true }
            });
            
            if (!document) {
                throw new Error('Document not found');
            }
            
            return {
                id: document.id,
                filename: document.filename,
                status: document.status,
                documentType: document.documentType,
                confidence: document.confidence,
                error: document.error,
                createdAt: document.createdAt,
                catalog: document.catalog
            };
        }),
    getDocument: publicProcedure
        .input(z.object({ documentId: z.number() }))
        .query(async ({ input }) => {
            const document = await prisma.document.findUnique({
                where: { id: input.documentId },
                include: { catalog: true }
            });
            
            if (!document) {
                throw new Error('Document not found');
            }
            
            return document;
        }),
    listDocuments: publicProcedure
        .input(z.object({ 
            catalogId: z.number().optional(),
            status: z.string().optional(),
            limit: z.number().default(50)
        }))
        .query(async ({ input }) => {
            const documents = await prisma.document.findMany({
                where: {
                    ...(input.catalogId && { catalogId: input.catalogId }),
                    ...(input.status && { status: input.status })
                },
                include: { catalog: true },
                orderBy: { createdAt: 'desc' },
                take: input.limit
            });
            
            return documents;
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
