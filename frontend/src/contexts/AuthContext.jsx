import axios from "axios";
import httpStatus from "http-status";
import { createContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";


export const AuthContext = createContext({});

const client = axios.create({
    baseURL: `${server}/api/v1/users`
});

const extractMessage = (error, fallback = "Something went wrong.") =>
    error?.response?.data?.message || error?.message || fallback;


export const AuthProvider = ({ children }) => {
    const [userData, setUserData] = useState(() => {
        const token = localStorage.getItem("token");
        const savedUser = localStorage.getItem("smartcon_user");
        return {
            token: token || "",
            user: savedUser ? JSON.parse(savedUser) : null
        };
    });
    const router = useNavigate();

    const authHeader = () => ({
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`
        }
    });

    const handleRegister = async (name, username, password) => {
        try {
            const request = await client.post("/register", { name, username, password });
            if (request.status === httpStatus.CREATED) {
                return request.data.message;
            }
        } catch (err) {
            throw new Error(extractMessage(err, "Registration failed."));
        }
    };

    const handleLogin = async (username, password) => {
        try {
            const request = await client.post("/login", { username, password });

            if (request.status === httpStatus.OK) {
                localStorage.setItem("token", request.data.token);
                localStorage.setItem("smartcon_user", JSON.stringify(request.data.user));
                setUserData({ token: request.data.token, user: request.data.user });
                router("/chat");
            }
        } catch (err) {
            throw new Error(extractMessage(err, "Login failed."));
        }
    };

    const fetchProfile = async () => {
        try {
            const request = await client.get("/profile", authHeader());
            localStorage.setItem("smartcon_user", JSON.stringify(request.data.user));
            setUserData((prev) => ({ ...prev, user: request.data.user }));
            return request.data.user;
        } catch (err) {
            throw new Error(extractMessage(err, "Could not fetch profile."));
        }
    };

    const getHistoryOfUser = async () => {
        try {
            const request = await client.get("/get_all_activity", authHeader());
            return request.data;
        } catch (err) {
            throw new Error(extractMessage(err, "Could not load history."));
        }
    };

    const addToUserHistory = async (meetingCode) => {
        try {
            const request = await client.post(
                "/add_to_activity",
                { meeting_code: meetingCode },
                authHeader()
            );
            return request;
        } catch (e) {
            throw new Error(extractMessage(e, "Could not save meeting history."));
        }
    };

    const clearHistory = async () => {
        try {
            const request = await client.delete("/history", authHeader());
            return request.data;
        } catch (err) {
            throw new Error(extractMessage(err, "Could not clear history."));
        }
    };

    const deleteHistoryItem = async (historyId) => {
        try {
            const request = await client.delete(`/history/${historyId}`, authHeader());
            return request.data;
        } catch (err) {
            throw new Error(extractMessage(err, "Could not delete history item."));
        }
    };

    const getChatMessages = async () => {
        try {
            const request = await client.get("/chat/messages", authHeader());
            return request.data;
        } catch (err) {
            throw new Error(extractMessage(err, "Could not load chat messages."));
        }
    };

    const getChatUsers = async () => {
        try {
            const request = await client.get("/chat/users", authHeader());
            return request.data;
        } catch (err) {
            throw new Error(extractMessage(err, "Could not load users."));
        }
    };

    const getFriendRequests = async () => {
        try {
            const request = await client.get("/chat/friend-requests", authHeader());
            return request.data;
        } catch (err) {
            throw new Error(extractMessage(err, "Could not load friend requests."));
        }
    };

    const sendFriendRequest = async (toUserId) => {
        try {
            const request = await client.post("/chat/friend-request", { toUserId }, authHeader());
            return request.data;
        } catch (err) {
            throw new Error(extractMessage(err, "Could not send friend request."));
        }
    };

    const respondFriendRequest = async (requestId, action) => {
        try {
            const request = await client.post(
                `/chat/friend-request/${requestId}/respond`,
                { action },
                authHeader()
            );
            return request.data;
        } catch (err) {
            throw new Error(extractMessage(err, "Could not respond to friend request."));
        }
    };

    const getDirectMessages = async (otherUserId) => {
        try {
            const request = await client.get(`/chat/direct/${otherUserId}`, authHeader());
            return request.data;
        } catch (err) {
            throw new Error(extractMessage(err, "Could not load direct messages."));
        }
    };

    const uploadChatMedia = async (file) => {
        try {
            const formData = new FormData();
            formData.append("media", file);

            const request = await client.post("/chat/upload", formData, {
                ...authHeader(),
                headers: {
                    ...authHeader().headers,
                    "Content-Type": "multipart/form-data"
                }
            });
            return request.data;
        } catch (err) {
            throw new Error(extractMessage(err, "Media upload failed."));
        }
    };

    const updateAvatar = async (avatar, avatarType = "preset") => {
        try {
            const request = await client.put("/avatar", { avatar, avatarType }, authHeader());
            localStorage.setItem("smartcon_user", JSON.stringify(request.data.user));
            setUserData((prev) => ({ ...prev, user: request.data.user }));
            return request.data.user;
        } catch (err) {
            throw new Error(extractMessage(err, "Could not update avatar."));
        }
    };

    const updateProfile = async (payload) => {
        try {
            const request = await client.put("/profile", payload, authHeader());
            localStorage.setItem("smartcon_user", JSON.stringify(request.data.user));
            setUserData((prev) => ({ ...prev, user: request.data.user }));
            return request.data.user;
        } catch (err) {
            throw new Error(extractMessage(err, "Could not update profile."));
        }
    };

    const deleteFriend = async (friendUserId) => {
        try {
            const request = await client.delete(`/chat/friend/${friendUserId}`, authHeader());
            return request.data;
        } catch (err) {
            throw new Error(extractMessage(err, "Could not delete friend."));
        }
    };

    const editDirectMessage = async (messageId, text) => {
        try {
            const request = await client.put(
                `/chat/direct/message/${messageId}`,
                { text },
                authHeader()
            );
            return request.data;
        } catch (err) {
            throw new Error(extractMessage(err, "Could not edit message."));
        }
    };

    const deleteDirectMessage = async (messageId) => {
        try {
            const request = await client.delete(`/chat/direct/message/${messageId}`, authHeader());
            return request.data;
        } catch (err) {
            throw new Error(extractMessage(err, "Could not delete message."));
        }
    };

    const deleteAccount = async () => {
        try {
            const request = await client.delete("/profile", authHeader());
            localStorage.removeItem("token");
            localStorage.removeItem("smartcon_user");
            setUserData({ token: "", user: null });
            router("/auth");
            return request.data;
        } catch (err) {
            throw new Error(extractMessage(err, "Could not delete account."));
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("smartcon_user");
        setUserData({ token: "", user: null });
        router("/auth");
    };


    const data = {
        userData,
        setUserData,
        addToUserHistory,
        clearHistory,
        deleteHistoryItem,
        getHistoryOfUser,
        handleRegister,
        handleLogin,
        fetchProfile,
        getChatMessages,
        getChatUsers,
        getFriendRequests,
        sendFriendRequest,
        respondFriendRequest,
        getDirectMessages,
        uploadChatMedia,
        updateAvatar,
        updateProfile,
        deleteFriend,
        editDirectMessage,
        deleteDirectMessage,
        deleteAccount,
        logout
    };

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    );

};
