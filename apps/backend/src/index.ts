import cors from 'cors'
import express from 'express'
import 'dotenv/config'
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter, createContext } from './trpc';
import { minioClient } from './minio';

export const app = express()

const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(cors())
app.use('/trpc', trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
}))

const bucket = 'files'

app.listen(PORT, async () => {
    console.log(`Listening on port ${PORT}`)

    const exists = await minioClient.bucketExists(bucket)
    if (exists) {
        console.log('Bucket ' + bucket + ' exists.')
    } else {
        await minioClient.makeBucket(bucket)
        console.log('Bucket ' + bucket + ' created.')
    }
})