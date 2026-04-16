import mongoose, { Schema } from "mongoose";

const friendRequestSchema = new Schema(
    {
        fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" }
    },
    { timestamps: true }
);

friendRequestSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });

const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema);

export { FriendRequest };
