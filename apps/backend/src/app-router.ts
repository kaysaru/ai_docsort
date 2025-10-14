import { publicProcedure, t } from "./trpc";
import { fileQueue, fileWorker } from "./redis";
import { clientSchema, documentSchema, startUploadSchema } from "./schemas";
import { CreateRouterOptions } from "@trpc/server/dist/unstable-core-do-not-import.cjs";

export const createRouterOptions: CreateRouterOptions = 