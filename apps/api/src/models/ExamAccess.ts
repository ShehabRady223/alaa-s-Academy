import { Schema, model } from 'mongoose';

/** A student's personal entry to one exam, opened with a PIN the teacher hands out. Part of the Exam feature; unrelated to homework Assignments. */
const schema = new Schema(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // owner (denormalised from the exam for cheap scoping)
    // HMAC of the PIN, used for lookup. A revoked access gets an unusable `revoked:<uuid>` value so the unique index stays plain.
    pinHash: { type: String, required: true, unique: true },
    pinEnc: { type: String, select: false }, // AES-256-GCM copy, so the teacher can show/print the PIN again
    expiresAt: { type: Date, default: null },
    maxAttempts: { type: Number, required: true, min: 1, max: 10 },
    status: { type: String, enum: ['active', 'revoked', 'completed'], default: 'active' },
    revokedAt: { type: Date },
  },
  { timestamps: true },
);
schema.index({ examId: 1, studentId: 1 }, { unique: true, partialFilterExpression: { revokedAt: { $exists: false } } });
schema.index({ teacherId: 1, createdAt: -1 }); // teacher's list
schema.index({ studentId: 1, status: 1 }); // student dashboard

export const ExamAccess = model('ExamAccess', schema);
