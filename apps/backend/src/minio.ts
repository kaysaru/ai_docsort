import * as Minio from 'minio'

export const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_HOST || 'localhost',
    port: (process.env.MINIO_PORT as unknown as number) || 9000,
    useSSL: false,
    accessKey: process.env.MINIO_ROOT_USER || "minioadmin",
    secretKey: process.env.MINIO_ROOT_PASSWORD || "minioadmin",
})
