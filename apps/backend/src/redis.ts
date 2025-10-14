// src/redis.ts
import { RedisOptions } from "ioredis";
import { Queue, Worker } from "bullmq";
import { runOCR } from "./services/ocr";
import { runML } from "./services/ml";

const connection: RedisOptions = {
  host: "localhost", // if inside Docker network, use "redis"
  port: 6379,
};

export const fileQueue = new Queue("file-processing", { connection });

// Example worker (can also run in a separate process)
export const fileWorker = new Worker(
  "file-processing",
  async (job) => {
    console.log("Processing job:", job.id, job.data);

    // Do OCR
    const text = await runOCR(job.data.filePath);

    // Do ML classification
    const result = await runML(text);

    // Update DB etc.
    return result;
  },
  { connection }
);
