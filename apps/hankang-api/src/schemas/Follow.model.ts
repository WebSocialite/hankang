import { Schema } from 'mongoose';

const FollowSchema = new Schema(
	{
		followingId: {
			type: Schema.Types.ObjectId,
			required: true,
		},

		followerId: {
			type: Schema.Types.ObjectId,
			required: true,
		},
	},
	{ timestamps: true, collection: "follows" },
);

FollowSchema.index({ followingId: 1, followerId: 1 }, { unique: true });  // followerId - bu biz; followingId biz follow qilmoqchi bolgan odam

export default FollowSchema;
