import mongoose, { Schema } from "mongoose";

const userScheme = new Schema(
    {
        name: { type: String, required: true },
        username: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        token: { type: String },
        /** Bumped on login/logout to invalidate prior access + refresh JWTs */
        authVersion: { type: Number, default: 0 },
        avatarType: { type: String, enum: ["preset", "upload"], default: "preset" },
        avatar: { type: String, default: "https://api.dicebear.com/8.x/identicon/svg?seed=github-4" },
        bio: { type: String, default: "" },
        gender: { type: String, enum: ["male", "female", "other", "prefer_not_say"], default: "prefer_not_say" },
        location: { type: String, default: "" }
    },
    { timestamps: true }
);

const User = mongoose.model("User", userScheme);

export { User };