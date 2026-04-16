import mongoose, { Schema } from "mongoose";

const chatMessageSchema = new Schema(
    {
        senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        senderName: { type: String, required: true },
        senderUsername: { type: String, required: true },
        senderAvatar: { type: String },
        text: { type: String, default: "" },
        mediaUrl: { type: String, default: "" },
        mediaType: { type: String, enum: ["image", "video", "other", ""], default: "" }
    },
    { timestamps: true }
);

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

export { ChatMessage };
