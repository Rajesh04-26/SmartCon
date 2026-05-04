import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Meeting } from "../models/meeting.model.js";
import { ChatMessage } from "../models/chatMessage.model.js";
import { FriendRequest } from "../models/friendRequest.model.js";
import { DirectMessage } from "../models/directMessage.model.js";
import { v2 as cloudinary } from "cloudinary";

const getErrorMessage = (error) => {
    if (!error) return "Unknown error";
    if (typeof error === "string") return error;
    return error.message || "Unknown error";
};

const JWT_SECRET = process.env.JWT_SECRET || "smartcon-dev-jwt-secret-change-in-production";
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "15m";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || "7d";
const REFRESH_COOKIE = "smartcon_refresh";

const isProd = process.env.NODE_ENV === "production";

const refreshCookieOptions = () => ({
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/api/v1/users",
    maxAge: 7 * 24 * 60 * 60 * 1000
});

const setRefreshCookie = (res, refreshToken) => {
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
};

const clearRefreshCookie = (res) => {
    res.clearCookie(REFRESH_COOKIE, {
        path: "/api/v1/users",
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax"
    });
};

const issueAccessToken = (userId, authVersion) =>
    jwt.sign({ sub: String(userId), ver: authVersion, typ: "access" }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });

const issueRefreshToken = (userId, authVersion) =>
    jwt.sign({ sub: String(userId), ver: authVersion, typ: "refresh" }, JWT_SECRET, { expiresIn: REFRESH_EXPIRES });

const resolveUserByAuthToken = async (rawToken) => {
    if (!rawToken || typeof rawToken !== "string") {
        return null;
    }
    try {
        const decoded = jwt.verify(rawToken, JWT_SECRET);
        if (decoded.typ !== "access") {
            return null;
        }
        const user = await User.findById(decoded.sub);
        if (!user || Number(user.authVersion ?? 0) !== Number(decoded.ver)) {
            return null;
        }
        return user;
    } catch {
        return User.findOne({ token: rawToken });
    }
};

const getTokenFromRequest = (req) => {
    const headerToken = req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null;
    return headerToken || req.headers["x-auth-token"] || req.query?.token || req.body?.token;
};

const getAuthUser = async (req) => {
    const token = getTokenFromRequest(req);
    if (!token) {
        return { error: "Missing auth token", status: httpStatus.UNAUTHORIZED };
    }

    const user = await resolveUserByAuthToken(token);
    if (!user) {
        return { error: "Invalid or expired token", status: httpStatus.UNAUTHORIZED };
    }

    return { user, token };
};

const configureCloudinary = () => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error(
            "Cloudinary config missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
        );
    }

    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret
    });
};

const uploadToCloudinary = async (file) => {
    try {
        const streamResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: "smartcon_chat",
                    resource_type: "auto"
                },
                (error, result) => {
                    if (error) return reject(error);
                    return resolve(result);
                }
            );
            stream.end(file.buffer);
        });
        return streamResult;
    } catch (streamError) {
        const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
        return cloudinary.uploader.upload(dataUri, {
            folder: "smartcon_chat",
            resource_type: "auto"
        });
    }
};

const getConversationId = (userIdA, userIdB) => [String(userIdA), String(userIdB)].sort().join("_");

const areFriends = async (userIdA, userIdB) => {
    const existing = await FriendRequest.findOne({
        status: "accepted",
        $or: [
            { fromUserId: userIdA, toUserId: userIdB },
            { fromUserId: userIdB, toUserId: userIdA }
        ]
    });
    return Boolean(existing);
};

const getFriendsCount = async (userId) => {
    return FriendRequest.countDocuments({
        status: "accepted",
        $or: [{ fromUserId: userId }, { toUserId: userId }]
    });
};

const serializeUser = async (user) => ({
    id: user._id,
    name: user.name,
    username: user.username,
    avatar: user.avatar,
    avatarType: user.avatarType,
    bio: user.bio,
    gender: user.gender,
    location: user.location,
    friendsCount: await getFriendsCount(user._id)
});

const login = async (req, res) => {

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "Username and password are required."
        });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User not found." });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (isPasswordCorrect) {
            const nextVer = Number(user.authVersion ?? 0) + 1;
            user.authVersion = nextVer;
            user.token = undefined;
            await user.save();

            const accessToken = issueAccessToken(user._id, nextVer);
            const refreshToken = issueRefreshToken(user._id, nextVer);
            setRefreshCookie(res, refreshToken);

            return res.status(httpStatus.OK).json({
                token: accessToken,
                user: await serializeUser(user)
            });
        }

        return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid username or password." });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Login failed: ${getErrorMessage(e)}`
        });
    }
};


const register = async (req, res) => {
    const { name, username, password } = req.body;

    if (!name || !username || !password) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "Name, username and password are required."
        });
    }

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(httpStatus.CONFLICT).json({ message: "User already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            username,
            password: hashedPassword
        });

        await newUser.save();

        res.status(httpStatus.CREATED).json({ message: "User registered successfully." });

    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Register failed: ${getErrorMessage(e)}`
        });
    }
};


const getUserHistory = async (req, res) => {
    try {
        const auth = await getAuthUser(req);
        if (auth.error) {
            return res.status(auth.status).json({ message: auth.error });
        }

        const meetings = await Meeting.find({ user_id: auth.user.username }).sort({ date: -1 });
        res.status(httpStatus.OK).json(meetings);
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Could not load history: ${getErrorMessage(e)}`
        });
    }
};

const addToHistory = async (req, res) => {
    const { meeting_code } = req.body;
    if (!meeting_code) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "meeting_code is required." });
    }

    try {
        const auth = await getAuthUser(req);
        if (auth.error) {
            return res.status(auth.status).json({ message: auth.error });
        }

        const newMeeting = new Meeting({
            user_id: auth.user.username,
            meetingCode: meeting_code
        });

        await newMeeting.save();

        res.status(httpStatus.CREATED).json({ message: "Added code to history." });
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Could not add history: ${getErrorMessage(e)}`
        });
    }
};

const clearUserHistory = async (req, res) => {
    try {
        const auth = await getAuthUser(req);
        if (auth.error) {
            return res.status(auth.status).json({ message: auth.error });
        }
        await Meeting.deleteMany({ user_id: auth.user.username });
        return res.status(httpStatus.OK).json({ message: "All meeting history cleared." });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Could not clear history: ${getErrorMessage(e)}`
        });
    }
};

const deleteHistoryItem = async (req, res) => {
    try {
        const auth = await getAuthUser(req);
        if (auth.error) {
            return res.status(auth.status).json({ message: auth.error });
        }
        const { historyId } = req.params;
        const deleted = await Meeting.findOneAndDelete({ _id: historyId, user_id: auth.user.username });
        if (!deleted) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "History entry not found." });
        }
        return res.status(httpStatus.OK).json({ message: "History entry deleted." });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Could not delete history entry: ${getErrorMessage(e)}`
        });
    }
};

const getCurrentUser = async (req, res) => {
    try {
        const auth = await getAuthUser(req);
        if (auth.error) {
            return res.status(auth.status).json({ message: auth.error });
        }

        return res.status(httpStatus.OK).json({
            user: await serializeUser(auth.user)
        });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Could not fetch profile: ${getErrorMessage(e)}`
        });
    }
};

const refreshSession = async (req, res) => {
    try {
        const raw = req.cookies?.[REFRESH_COOKIE];
        if (!raw) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Missing refresh session." });
        }

        const decoded = jwt.verify(raw, JWT_SECRET);
        if (decoded.typ !== "refresh") {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid refresh session." });
        }

        const user = await User.findById(decoded.sub);
        if (!user || Number(user.authVersion ?? 0) !== Number(decoded.ver)) {
            clearRefreshCookie(res);
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid or expired refresh session." });
        }

        const accessToken = issueAccessToken(user._id, user.authVersion);
        const newRefresh = issueRefreshToken(user._id, user.authVersion);
        setRefreshCookie(res, newRefresh);

        return res.status(httpStatus.OK).json({
            token: accessToken,
            user: await serializeUser(user)
        });
    } catch (e) {
        clearRefreshCookie(res);
        return res.status(httpStatus.UNAUTHORIZED).json({
            message: `Could not refresh session: ${getErrorMessage(e)}`
        });
    }
};

const logout = async (req, res) => {
    const rawRefresh = req.cookies?.[REFRESH_COOKIE];
    try {
        const auth = await getAuthUser(req);
        if (!auth.error) {
            auth.user.authVersion = Number(auth.user.authVersion ?? 0) + 1;
            auth.user.token = undefined;
            await auth.user.save();
            clearRefreshCookie(res);
            return res.status(httpStatus.OK).json({ message: "Logged out." });
        }
    } catch {
        /* ignore */
    }

    if (rawRefresh) {
        try {
            const decoded = jwt.verify(rawRefresh, JWT_SECRET);
            if (decoded.typ === "refresh" && decoded.sub) {
                const user = await User.findById(decoded.sub);
                if (user && Number(user.authVersion ?? 0) === Number(decoded.ver)) {
                    user.authVersion = Number(user.authVersion ?? 0) + 1;
                    user.token = undefined;
                    await user.save();
                }
            }
        } catch {
            /* invalid refresh */
        }
    }

    clearRefreshCookie(res);
    return res.status(httpStatus.OK).json({ message: "Logged out." });
};

const updateAvatar = async (req, res) => {
    const { avatar, avatarType } = req.body;

    if (!avatar) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "avatar is required." });
    }

    try {
        const auth = await getAuthUser(req);
        if (auth.error) {
            return res.status(auth.status).json({ message: auth.error });
        }

        auth.user.avatar = avatar;
        auth.user.avatarType = avatarType === "upload" ? "upload" : "preset";
        await auth.user.save();

        return res.status(httpStatus.OK).json({
            message: "Avatar updated.",
            user: await serializeUser(auth.user)
        });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Could not update avatar: ${getErrorMessage(e)}`
        });
    }
};

const uploadChatMedia = async (req, res) => {
    try {
        const auth = await getAuthUser(req);
        if (auth.error) {
            return res.status(auth.status).json({ message: auth.error });
        }

        if (!req.file) {
            return res.status(httpStatus.BAD_REQUEST).json({ message: "No media file uploaded." });
        }

        configureCloudinary();

        const uploadResult = await uploadToCloudinary(req.file);

        return res.status(httpStatus.OK).json({
            mediaUrl: uploadResult.secure_url,
            mediaType: req.file.mimetype.startsWith("image/")
                ? "image"
                : req.file.mimetype.startsWith("video/")
                    ? "video"
                    : "other"
        });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Cloudinary upload failed: ${e?.message || getErrorMessage(e)}`
        });
    }
};

const getChatMessages = async (req, res) => {
    try {
        const auth = await getAuthUser(req);
        if (auth.error) {
            return res.status(auth.status).json({ message: auth.error });
        }

        const limit = Math.min(Number(req.query.limit) || 100, 300);
        const messages = await ChatMessage.find({})
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        return res.status(httpStatus.OK).json(messages.reverse());
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Could not fetch chat messages: ${getErrorMessage(e)}`
        });
    }
};

const getUsersForChat = async (req, res) => {
    try {
        const auth = await getAuthUser(req);
        if (auth.error) {
            return res.status(auth.status).json({ message: auth.error });
        }

        const users = await User.find({ _id: { $ne: auth.user._id } })
            .select("_id name username avatar")
            .lean();

        const links = await FriendRequest.find({
            $or: [{ fromUserId: auth.user._id }, { toUserId: auth.user._id }]
        }).lean();

        const requestsByUser = new Map();
        links.forEach((link) => {
            const otherId =
                String(link.fromUserId) === String(auth.user._id)
                    ? String(link.toUserId)
                    : String(link.fromUserId);
            requestsByUser.set(otherId, link);
        });

        const payload = users.map((user) => {
            const relation = requestsByUser.get(String(user._id));
            if (!relation) {
                return { ...user, relationStatus: "none" };
            }

            if (relation.status === "accepted") {
                return { ...user, relationStatus: "friend" };
            }

            if (relation.status === "pending") {
                if (String(relation.fromUserId) === String(auth.user._id)) {
                    return { ...user, relationStatus: "pending_sent", requestId: relation._id };
                }
                return { ...user, relationStatus: "pending_received", requestId: relation._id };
            }

            return { ...user, relationStatus: "none" };
        });

        return res.status(httpStatus.OK).json(payload);
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Could not fetch users: ${getErrorMessage(e)}`
        });
    }
};

const sendFriendRequest = async (req, res) => {
    const { toUserId } = req.body;
    if (!toUserId) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "toUserId is required." });
    }

    try {
        const auth = await getAuthUser(req);
        if (auth.error) {
            return res.status(auth.status).json({ message: auth.error });
        }

        if (String(auth.user._id) === String(toUserId)) {
            return res.status(httpStatus.BAD_REQUEST).json({ message: "Cannot send request to yourself." });
        }

        const targetUser = await User.findById(toUserId);
        if (!targetUser) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "Target user not found." });
        }

        const existingLinks = await FriendRequest.find({
            $or: [
                { fromUserId: auth.user._id, toUserId },
                { fromUserId: toUserId, toUserId: auth.user._id }
            ]
        }).sort({ updatedAt: -1 });
        const existing = existingLinks[0];

        if (existing) {
            if (existing.status === "accepted") {
                return res.status(httpStatus.CONFLICT).json({ message: "You are already friends." });
            }
            if (existing.status === "pending") {
                return res.status(httpStatus.CONFLICT).json({ message: "Friend request already exists." });
            }
            await FriendRequest.deleteMany({
                status: "rejected",
                $or: [
                    { fromUserId: auth.user._id, toUserId },
                    { fromUserId: toUserId, toUserId: auth.user._id }
                ]
            });
        }

        const request = await FriendRequest.create({
            fromUserId: auth.user._id,
            toUserId
        });

        return res.status(httpStatus.CREATED).json({ message: "Friend request sent.", request });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Could not send request: ${getErrorMessage(e)}`
        });
    }
};

const getFriendRequests = async (req, res) => {
    try {
        const auth = await getAuthUser(req);
        if (auth.error) {
            return res.status(auth.status).json({ message: auth.error });
        }

        const incoming = await FriendRequest.find({
            toUserId: auth.user._id,
            status: "pending"
        })
            .populate("fromUserId", "_id name username avatar")
            .lean();

        return res.status(httpStatus.OK).json(incoming);
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Could not fetch requests: ${getErrorMessage(e)}`
        });
    }
};

const respondFriendRequest = async (req, res) => {
    const { requestId } = req.params;
    const { action } = req.body;

    if (!["accept", "reject"].includes(action)) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "action must be accept or reject." });
    }

    try {
        const auth = await getAuthUser(req);
        if (auth.error) {
            return res.status(auth.status).json({ message: auth.error });
        }

        const request = await FriendRequest.findById(requestId);
        if (!request) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "Friend request not found." });
        }

        if (String(request.toUserId) !== String(auth.user._id)) {
            return res.status(httpStatus.FORBIDDEN).json({ message: "Not allowed to respond this request." });
        }

        request.status = action === "accept" ? "accepted" : "rejected";
        await request.save();

        return res.status(httpStatus.OK).json({
            message: action === "accept" ? "Friend request accepted." : "Friend request rejected."
        });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Could not respond request: ${getErrorMessage(e)}`
        });
    }
};

const deleteFriend = async (req, res) => {
    try {
        const auth = await getAuthUser(req);
        if (auth.error) return res.status(auth.status).json({ message: auth.error });
        const { friendUserId } = req.params;
        const conversationId = getConversationId(auth.user._id, friendUserId);

        await FriendRequest.deleteMany({
            status: "accepted",
            $or: [
                { fromUserId: auth.user._id, toUserId: friendUserId },
                { fromUserId: friendUserId, toUserId: auth.user._id }
            ]
        });
        await DirectMessage.deleteMany({ conversationId });
        return res.status(httpStatus.OK).json({ message: "Friend removed." });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Could not remove friend: ${getErrorMessage(e)}`
        });
    }
};

const updateProfile = async (req, res) => {
    try {
        const auth = await getAuthUser(req);
        if (auth.error) return res.status(auth.status).json({ message: auth.error });
        const { name, bio, gender, location } = req.body;
        if (typeof name === "string" && name.trim()) auth.user.name = name.trim();
        if (typeof bio === "string") auth.user.bio = bio.slice(0, 280);
        if (["male", "female", "other", "prefer_not_say"].includes(gender)) auth.user.gender = gender;
        if (typeof location === "string") auth.user.location = location.slice(0, 80);
        await auth.user.save();
        return res.status(httpStatus.OK).json({ message: "Profile updated.", user: await serializeUser(auth.user) });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Could not update profile: ${getErrorMessage(e)}`
        });
    }
};

const deleteAccount = async (req, res) => {
    try {
        const auth = await getAuthUser(req);
        if (auth.error) return res.status(auth.status).json({ message: auth.error });
        clearRefreshCookie(res);
        await FriendRequest.deleteMany({ $or: [{ fromUserId: auth.user._id }, { toUserId: auth.user._id }] });
        await DirectMessage.deleteMany({ $or: [{ senderId: auth.user._id }, { receiverId: auth.user._id }] });
        await ChatMessage.deleteMany({ senderId: auth.user._id });
        await Meeting.deleteMany({ user_id: auth.user.username });
        await User.deleteOne({ _id: auth.user._id });
        return res.status(httpStatus.OK).json({ message: "Account deleted successfully." });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Could not delete account: ${getErrorMessage(e)}`
        });
    }
};

const getDirectMessages = async (req, res) => {
    try {
        const auth = await getAuthUser(req);
        if (auth.error) {
            return res.status(auth.status).json({ message: auth.error });
        }

        const { otherUserId } = req.params;
        const friend = await areFriends(auth.user._id, otherUserId);
        if (!friend) {
            return res.status(httpStatus.FORBIDDEN).json({ message: "You can chat only with friends." });
        }

        const conversationId = getConversationId(auth.user._id, otherUserId);
        const messages = await DirectMessage.find({ conversationId }).sort({ createdAt: 1 }).lean();
        return res.status(httpStatus.OK).json(messages);
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Could not fetch direct messages: ${getErrorMessage(e)}`
        });
    }
};

const updateDirectMessage = async (req, res) => {
    try {
        const auth = await getAuthUser(req);
        if (auth.error) return res.status(auth.status).json({ message: auth.error });
        const { messageId } = req.params;
        const { text } = req.body;
        const message = await DirectMessage.findById(messageId);
        if (!message) return res.status(httpStatus.NOT_FOUND).json({ message: "Message not found." });
        if (String(message.senderId) !== String(auth.user._id)) {
            return res.status(httpStatus.FORBIDDEN).json({ message: "You can edit only your own message." });
        }
        message.text = typeof text === "string" ? text : message.text;
        await message.save();
        return res.status(httpStatus.OK).json({ message: "Message updated.", data: message });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Could not update message: ${getErrorMessage(e)}`
        });
    }
};

const deleteDirectMessage = async (req, res) => {
    try {
        const auth = await getAuthUser(req);
        if (auth.error) return res.status(auth.status).json({ message: auth.error });
        const { messageId } = req.params;
        const message = await DirectMessage.findById(messageId);
        if (!message) return res.status(httpStatus.NOT_FOUND).json({ message: "Message not found." });
        if (String(message.senderId) !== String(auth.user._id)) {
            return res.status(httpStatus.FORBIDDEN).json({ message: "You can delete only your own message." });
        }
        await DirectMessage.deleteOne({ _id: messageId });
        return res.status(httpStatus.OK).json({ message: "Message deleted." });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: `Could not delete message: ${getErrorMessage(e)}`
        });
    }
};

const saveChatMessage = async (payload) => {
    const token = payload?.token;
    if (!token) {
        throw new Error("Missing token in chat payload.");
    }

    const user = await resolveUserByAuthToken(token);
    if (!user) {
        throw new Error("Invalid chat token.");
    }

    const message = new ChatMessage({
        senderId: user._id,
        senderName: user.name,
        senderUsername: user.username,
        senderAvatar: user.avatar,
        text: payload.text || "",
        mediaUrl: payload.mediaUrl || "",
        mediaType: payload.mediaType || ""
    });

    await message.save();
    return message.toObject();
};

const saveDirectChatMessage = async (payload) => {
    const { token, receiverId, text = "", mediaUrl = "", mediaType = "" } = payload || {};
    if (!token || !receiverId) {
        throw new Error("Missing token or receiverId in direct message payload.");
    }

    const sender = await resolveUserByAuthToken(token);
    if (!sender) {
        throw new Error("Invalid chat token.");
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
        throw new Error("Receiver not found.");
    }

    const friend = await areFriends(sender._id, receiver._id);
    if (!friend) {
        throw new Error("You can chat only with accepted friends.");
    }

    const conversationId = getConversationId(sender._id, receiver._id);
    const message = new DirectMessage({
        conversationId,
        senderId: sender._id,
        receiverId: receiver._id,
        senderName: sender.name,
        senderUsername: sender.username,
        senderAvatar: sender.avatar,
        text,
        mediaUrl,
        mediaType
    });

    await message.save();
    return message.toObject();
};

export {
    login,
    register,
    refreshSession,
    logout,
    getUserHistory,
    addToHistory,
    clearUserHistory,
    deleteHistoryItem,
    getCurrentUser,
    updateAvatar,
    getChatMessages,
    getUsersForChat,
    sendFriendRequest,
    getFriendRequests,
    respondFriendRequest,
    deleteFriend,
    updateProfile,
    deleteAccount,
    getDirectMessages,
    updateDirectMessage,
    deleteDirectMessage,
    saveChatMessage,
    saveDirectChatMessage,
    uploadChatMedia
};