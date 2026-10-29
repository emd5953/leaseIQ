import { Schema, model } from 'mongoose';
const snapshotSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    digest: { type: String, required: true },
    report: { type: Schema.Types.Mixed, required: true },
    shareHash: { type: String, select: false },
    sharedAt: Date,
  },
  { timestamps: true },
);
snapshotSchema.index({ userId: 1, digest: 1 }, { unique: true });
snapshotSchema.index({ shareHash: 1 }, { unique: true, sparse: true });
export const ResearchSnapshot = model('ResearchSnapshot', snapshotSchema);
const comparisonSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, unique: true, required: true },
    snapshotIds: [{ type: Schema.Types.ObjectId, ref: 'ResearchSnapshot' }],
  },
  { timestamps: true },
);
export const ResearchComparison = model('ResearchComparison', comparisonSchema);
