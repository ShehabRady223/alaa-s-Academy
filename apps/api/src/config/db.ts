import mongoose from 'mongoose';
import { env } from './env';

let connecting: Promise<void> | null = null;

/** Safe to call on every request: connects once per process (serverless instance) and reuses the connection. */
export function connectDb(): Promise<void> {
  connecting ??= (async () => {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS ?? 8000), maxPoolSize: 5 });
    console.log('MongoDB connected');
  })().catch((e) => { connecting = null; throw e; }); // a failed attempt must not be cached forever
  return connecting;
}
