import mongoose, { Schema } from "mongoose";

const directMessageSchema = new Schema(
    {
        conversationId: { type: String, required: true, index: true },
        senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        senderName: { type: String, required: true },
        senderUsername: { type: String, required: true },
        senderAvatar: { type: String, default: "" },
        text: { type: String, default: "" },
        mediaUrl: { type: String, default: "" },
        mediaType: { type: String, enum: ["image", "video", "other", ""], default: "" }
    },
    { timestamps: true }
);

const DirectMessage = mongoose.model("DirectMessage", directMessageSchema);

export { DirectMessage };
