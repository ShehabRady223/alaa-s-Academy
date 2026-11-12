import mongoose from 'mongoose';

// Serverless: do not let every model build its indexes in the background on every cold start.
// `ensureReady()` creates them once, explicitly, before the first request is served.
mongoose.set('autoIndex', false);
