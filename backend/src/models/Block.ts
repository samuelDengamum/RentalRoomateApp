import mongoose, { Schema, Document } from 'mongoose';

export interface IBlock extends Document {
  blockerId: mongoose.Types.ObjectId;
  blockedId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const BlockSchema = new Schema<IBlock>(
  {
    blockerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    blockedId: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

BlockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

export default mongoose.model<IBlock>('Block', BlockSchema);
