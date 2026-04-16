import { Router } from "express";
import multer from "multer";
import {
    addToHistory,
    clearUserHistory,
    deleteHistoryItem,
    deleteAccount,
    deleteDirectMessage,
    deleteFriend,
    getDirectMessages,
    getChatMessages,
    getCurrentUser,
    getFriendRequests,
    getUserHistory,
    getUsersForChat,
    login,
    respondFriendRequest,
    register,
    sendFriendRequest,
    updateDirectMessage,
    updateProfile,
    updateAvatar,
    uploadChatMedia
} from "../controllers/user.controller.js";



const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.route("/login").post(login);
router.route("/register").post(register);
router.route("/profile").get(getCurrentUser);
router.route("/profile").put(updateProfile);
router.route("/profile").delete(deleteAccount);
router.route("/avatar").put(updateAvatar);
router.route("/chat/users").get(getUsersForChat);
router.route("/chat/friend-request").post(sendFriendRequest);
router.route("/chat/friend-requests").get(getFriendRequests);
router.route("/chat/friend-request/:requestId/respond").post(respondFriendRequest);
router.route("/chat/direct/:otherUserId").get(getDirectMessages);
router.route("/chat/direct/message/:messageId").put(updateDirectMessage).delete(deleteDirectMessage);
router.route("/chat/friend/:friendUserId").delete(deleteFriend);
router.route("/chat/messages").get(getChatMessages);
router.route("/chat/upload").post(upload.single("media"), uploadChatMedia);
router.route("/add_to_activity").post(addToHistory);
router.route("/get_all_activity").get(getUserHistory);
router.route("/history").delete(clearUserHistory);
router.route("/history/:historyId").delete(deleteHistoryItem);

export default router;