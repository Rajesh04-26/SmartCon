import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import io from "socket.io-client";
import {
    Alert,
    Avatar,
    Badge,
    Button,
    Chip,
    IconButton,
    Menu,
    MenuItem,
    Snackbar,
    Tab,
    Tabs,
    TextField
} from "@mui/material";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import MarkEmailUnreadIcon from "@mui/icons-material/MarkEmailUnread";
import SendIcon from "@mui/icons-material/Send";
import InsertEmoticonIcon from "@mui/icons-material/InsertEmoticon";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import withAuth from "../utils/withAuth";
import { AuthContext } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import server from "../environment";

const emojis = ["😀", "😁", "😂", "🤣", "😊", "😍", "😎", "😢", "😭", "😡", "😮", "🤔", "👍", "👏", "🙏", "💯", "🔥", "🎉", "❤️", "🤝", "👋", "✅"];

function ChatPage() {
    const {
        userData,
        fetchProfile,
        getChatUsers,
        getFriendRequests,
        sendFriendRequest,
        respondFriendRequest,
        getDirectMessages,
        deleteFriend,
        editDirectMessage,
        deleteDirectMessage,
        uploadChatMedia
    } = useContext(AuthContext);

    const [users, setUsers] = useState([]);
    const [requests, setRequests] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [activeTab, setActiveTab] = useState("all");
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [mediaPayload, setMediaPayload] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const socketRef = useRef(null);
    const bottomRef = useRef(null);
    const messageListRef = useRef(null);
    const conversationIdRef = useRef("");
    const unreadRef = useRef({});
    const shouldAutoScrollRef = useRef(true);
    const loadRequestIdRef = useRef(0);
    const instantScrollRef = useRef(false);
    const pressTimerRef = useRef(null);
    const [messageMenu, setMessageMenu] = useState({ anchor: null, message: null });

    const token = localStorage.getItem("token");

    const currentUser = useMemo(() => userData?.user || null, [userData]);
    const conversationId = useMemo(() => {
        if (!selectedUser || !currentUser?.id) return "";
        return [currentUser.id, selectedUser._id].sort().join("_");
    }, [selectedUser, currentUser]);

    useEffect(() => {
        conversationIdRef.current = conversationId;
    }, [conversationId]);

    // Run once on mount; context function identities change frequently.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        const setup = async () => {
            try {
                await fetchProfile();
                const [allUsers, incomingRequests] = await Promise.all([
                    getChatUsers(),
                    getFriendRequests()
                ]);
                setUsers(allUsers);
                setRequests(incomingRequests);
            } catch (e) {
                setError(e.message);
            }
        };

        setup();
    }, []);

    useEffect(() => {
        const loadMessages = async () => {
            const loadRequestId = ++loadRequestIdRef.current;
            if (!selectedUser) {
                setMessages([]);
                return;
            }
            try {
                instantScrollRef.current = true;
                const history = await getDirectMessages(selectedUser._id);
                if (loadRequestId !== loadRequestIdRef.current) return;
                setMessages(history);
            } catch (e) {
                if (loadRequestId !== loadRequestIdRef.current) return;
                setMessages([]);
                setError(e.message);
            }
        };
        loadMessages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedUser?._id]);

    useEffect(() => {
        socketRef.current = io(server, { transports: ["websocket"] });
        socketRef.current.on("direct-chat-message", (incoming) => {
            if (!incoming) return;
            if (incoming?.conversationId === conversationIdRef.current) {
                setMessages((prev) => [...prev, incoming]);
            } else {
                const senderId = incoming.senderId;
                if (senderId) {
                    setUsers((prev) =>
                        prev.map((u) =>
                            u._id === senderId ? { ...u, unreadCount: (u.unreadCount || 0) + 1 } : u
                        )
                    );
                    unreadRef.current[senderId] = (unreadRef.current[senderId] || 0) + 1;
                }
            }
        });

        socketRef.current.on("chat-error", (payload) => {
            setError(payload?.message || "Socket error happened.");
        });

        socketRef.current.on("direct-chat-message-updated", ({ messageId, text: updatedText }) => {
            setMessages((prev) => prev.map((msg) => (msg._id === messageId ? { ...msg, text: updatedText } : msg)));
        });

        socketRef.current.on("direct-chat-message-deleted", ({ messageId }) => {
            setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, []);

    useEffect(() => {
        if (conversationId && socketRef.current) {
            socketRef.current.emit("join-direct-chat", conversationId);
            shouldAutoScrollRef.current = true;
        }
    }, [conversationId]);

    useEffect(() => {
        if (shouldAutoScrollRef.current) {
            const behavior = "auto";
            bottomRef.current?.scrollIntoView({ behavior });
            instantScrollRef.current = false;
        }
    }, [messages]);

    const reloadUsersAndRequests = async () => {
        const [allUsers, incomingRequests] = await Promise.all([getChatUsers(), getFriendRequests(), fetchProfile()]);
        const hydratedUsers = allUsers.map((user) => ({
            ...user,
            unreadCount: unreadRef.current[user._id] || 0
        }));
        setUsers(hydratedUsers);
        setRequests(incomingRequests);
        if (selectedUser?._id) {
            const refreshedSelected = hydratedUsers.find((u) => u._id === selectedUser._id);
            if (refreshedSelected) {
                setSelectedUser(refreshedSelected);
            }
        }
    };

    const sendMessage = async () => {
        if (!selectedUser) return;
        if (!text.trim() && !mediaPayload?.mediaUrl) return;
        if (selectedUser.relationStatus !== "friend") {
            setError("You can chat only with friends. Accept friend request first.");
            return;
        }
        if (!token) {
            setError("Session expired. Please login again.");
            return;
        }
        if (!socketRef.current) {
            setError("Chat connection is not ready. Please wait a moment.");
            return;
        }
        setIsSending(true);
        try {
            socketRef.current.emit("join-direct-chat", conversationId);
            socketRef.current.emit("send-direct-chat-message", {
                token,
                receiverId: selectedUser._id,
                text: text.trim(),
                mediaUrl: mediaPayload?.mediaUrl || "",
                mediaType: mediaPayload?.mediaType || ""
            });
            setText("");
            setMediaPayload(null);
        } catch (e) {
            setError(e.message);
        } finally {
            setIsSending(false);
        }
    };

    const handleSelectUser = (user) => {
        const latest = users.find((u) => u._id === user._id) || user;
        loadRequestIdRef.current += 1;
        instantScrollRef.current = true;
        setSelectedUser(latest);
        unreadRef.current[user._id] = 0;
        setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, unreadCount: 0 } : u)));
    };

    const handleSendRequest = async (toUserId) => {
        try {
            await sendFriendRequest(toUserId);
            setUsers((prev) =>
                prev.map((user) =>
                    user._id === toUserId ? { ...user, relationStatus: "pending_sent" } : user
                )
            );
            setSuccess("Friend request sent.");
            reloadUsersAndRequests();
        } catch (e) {
            if ((e.message || "").toLowerCase().includes("already exists")) {
                setSuccess("Request is already pending.");
            } else {
                setError(e.message);
            }
        }
    };

    const handleRespondRequest = async (requestId, action) => {
        try {
            const requestItem = requests.find((req) => req._id === requestId);
            await respondFriendRequest(requestId, action);
            const changedUserId = requestItem?.fromUserId?._id;
            setRequests((prev) => prev.filter((req) => req._id !== requestId));
            if (changedUserId) {
                setUsers((prev) =>
                    prev.map((user) =>
                        user._id === changedUserId
                            ? { ...user, relationStatus: action === "accept" ? "friend" : "none" }
                            : user
                    )
                );
            }
            setSuccess(action === "accept" ? "Request accepted." : "Request rejected.");
            reloadUsersAndRequests();
        } catch (e) {
            setError(e.message);
        }
    };

    const handleDeleteFriend = async (friendUserId) => {
        try {
            await deleteFriend(friendUserId);
            setUsers((prev) =>
                prev.map((user) => (user._id === friendUserId ? { ...user, relationStatus: "none" } : user))
            );
            if (selectedUser?._id === friendUserId) {
                setMessages([]);
            }
            setSuccess("Friend removed.");
            reloadUsersAndRequests();
        } catch (e) {
            setError(e.message);
        }
    };

    const filteredUsers = useMemo(() => {
        if (activeTab === "friends") {
            return users.filter((u) => u.relationStatus === "friend");
        }
        return users;
    }, [activeTab, users]);

    const pendingCount = requests.length;
    const unreadCount = users.reduce((sum, user) => sum + (user.unreadCount || 0), 0);

    const handleMediaUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!selectedUser) {
            setError("Select a user before uploading media.");
            return;
        }

        setIsUploading(true);
        try {
            const uploaded = await uploadChatMedia(file);
            setMediaPayload(uploaded);
            setSuccess("Media uploaded. Click send to post.");
        } catch (e) {
            setError(e.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="chatPage pageWithNavbar">
            <Navbar />
            <div className="chatLayout">
                <aside className="chatSidebar">
                    <div className="chatFiltersHeader">
                        <h4 className="premiumSectionTitle">Users</h4>
                        <div className="chatBadgeRow">
                            <Badge badgeContent={pendingCount} color="error">
                                <MarkEmailUnreadIcon fontSize="small" />
                            </Badge>
                            <Badge badgeContent={unreadCount} color="primary">
                                <SendIcon fontSize="small" />
                            </Badge>
                        </div>
                    </div>
                    <Tabs
                        value={activeTab}
                        onChange={(_, value) => setActiveTab(value)}
                        textColor="inherit"
                        indicatorColor="secondary"
                        className="chatTabs"
                    >
                        <Tab value="all" label="All Users" />
                        <Tab value="friends" label="Friends Only" />
                    </Tabs>
                    <div className="userList">
                        {filteredUsers.map((user) => (
                            <div key={user._id} className="userListItem">
                                <div className="userListInfo" onClick={() => handleSelectUser(user)}>
                                    <Avatar src={user.avatar} sx={{ width: 40, height: 40 }} />
                                    <span>{user.name}</span>
                                </div>
                                {user.relationStatus === "none" ? (
                                    <Button
                                        size="small"
                                        startIcon={<PersonAddAlt1Icon />}
                                        onClick={() => handleSendRequest(user._id)}
                                    >
                                        Add
                                    </Button>
                                ) : null}
                                {user.relationStatus === "pending_sent" ? <Chip size="small" label="Pending" /> : null}
                                {user.relationStatus === "pending_received" ? <Chip size="small" color="warning" label="Requested You" /> : null}
                                {user.relationStatus === "friend" ? (
                                    <Button
                                        size="small"
                                        variant="contained"
                                        color="error"
                                        className="ovalActionBtn"
                                        onClick={() => handleDeleteFriend(user._id)}
                                    >
                                        Delete
                                    </Button>
                                ) : null}
                                {user.unreadCount > 0 ? <Chip size="small" color="primary" label={user.unreadCount} /> : null}
                            </div>
                        ))}
                    </div>
                    <h4 className="premiumSectionTitle" style={{ marginTop: 16 }}>Requests</h4>
                    <div className="requestList">
                        {requests.length === 0 ? <p>No pending requests</p> : null}
                        {requests.map((req) => (
                            <div className="requestItem" key={req._id}>
                                <span>{req.fromUserId?.name}</span>
                                <div style={{ display: "flex", gap: 6 }}>
                                    <Button size="small" onClick={() => handleRespondRequest(req._id, "accept")}>Accept</Button>
                                    <Button size="small" color="error" onClick={() => handleRespondRequest(req._id, "reject")}>Reject</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                <main className="chatMain">
                    <h2>
                        SmartCon Chat {selectedUser ? `- ${selectedUser.name}` : "- Select a user"}
                    </h2>
                    <div
                        className="messageList"
                        ref={messageListRef}
                        onScroll={(e) => {
                            const el = e.currentTarget;
                            const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
                            shouldAutoScrollRef.current = isNearBottom;
                        }}
                    >
                        {messages.map((msg) => (
                            <div
                                key={msg._id || `${msg.senderUsername}-${msg.createdAt}`}
                                className={`messageItem ${
                                    msg.senderUsername === currentUser?.username ? "myMessage" : ""
                                }`}
                                onMouseDown={(e) => {
                                    if (msg.senderUsername !== currentUser?.username) return;
                                    pressTimerRef.current = setTimeout(() => {
                                        setMessageMenu({ anchor: e.currentTarget, message: msg });
                                    }, 900);
                                }}
                                onClick={(e) => {
                                    if (msg.senderUsername !== currentUser?.username) return;
                                    setMessageMenu({ anchor: e.currentTarget, message: msg });
                                }}
                                onContextMenu={(e) => {
                                    if (msg.senderUsername !== currentUser?.username) return;
                                    e.preventDefault();
                                    setMessageMenu({ anchor: e.currentTarget, message: msg });
                                }}
                                onMouseUp={() => clearTimeout(pressTimerRef.current)}
                                onMouseLeave={() => clearTimeout(pressTimerRef.current)}
                            >
                                <Avatar src={msg.senderAvatar} sx={{ width: 28, height: 28 }} />
                                <div className="messageContent">
                                    <strong>{msg.senderName}</strong>
                                    {msg.text ? <p>{msg.text}</p> : null}
                                    {msg.mediaUrl && msg.mediaType === "image" ? (
                                        <img src={msg.mediaUrl} alt="chat media" className="chatMedia" />
                                    ) : null}
                                    {msg.mediaUrl && msg.mediaType === "video" ? (
                                        <video controls src={msg.mediaUrl} className="chatMedia" />
                                    ) : null}
                                </div>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>

                    <div className="chatComposer">
                        {showEmojiPicker ? (
                            <div className="emojiDropdown">
                                {emojis.map((emoji) => (
                                    <button key={emoji} onClick={() => setText((prev) => `${prev}${emoji}`)}>
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        ) : null}
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Type message..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="premiumInput"
                        />
                        <IconButton onClick={() => setShowEmojiPicker((prev) => !prev)} className="chatActionIcon">
                            <InsertEmoticonIcon />
                        </IconButton>
                        <Button
                            variant="outlined"
                            component="label"
                            disabled={isUploading}
                            startIcon={<AttachFileIcon />}
                            size="small"
                            className="chatMediaBtn"
                        >
                            Media
                            <input hidden type="file" accept="image/*,video/*" onChange={handleMediaUpload} />
                        </Button>
                        <Button
                            variant="contained"
                            disabled={isSending || isUploading}
                            onClick={sendMessage}
                            endIcon={<SendIcon />}
                            size="small"
                            className="chatPrimaryBtn"
                        >
                            Send
                        </Button>
                    </div>
                    {selectedUser && selectedUser.relationStatus !== "friend" ? (
                        <p style={{ marginTop: 10, color: "var(--warning)" }}>
                            Accept friend request first to start chatting.
                        </p>
                    ) : null}

                    <Menu
                        anchorEl={messageMenu.anchor}
                        open={Boolean(messageMenu.anchor)}
                        onClose={() => setMessageMenu({ anchor: null, message: null })}
                    >
                        <MenuItem
                            onClick={async () => {
                                const newText = window.prompt("Edit message", messageMenu.message?.text || "");
                                if (newText === null) return;
                                await editDirectMessage(messageMenu.message._id, newText);
                                setMessages((prev) =>
                                    prev.map((m) => (m._id === messageMenu.message._id ? { ...m, text: newText } : m))
                                );
                                socketRef.current.emit("direct-chat-message-updated", {
                                    conversationId,
                                    messageId: messageMenu.message._id,
                                    text: newText
                                });
                                setMessageMenu({ anchor: null, message: null });
                            }}
                        >
                            Edit
                        </MenuItem>
                        <MenuItem
                            onClick={async () => {
                                await deleteDirectMessage(messageMenu.message._id);
                                setMessages((prev) => prev.filter((m) => m._id !== messageMenu.message._id));
                                socketRef.current.emit("direct-chat-message-deleted", {
                                    conversationId,
                                    messageId: messageMenu.message._id
                                });
                                setMessageMenu({ anchor: null, message: null });
                            }}
                        >
                            Delete
                        </MenuItem>
                    </Menu>
                </main>
            </div>

            <Snackbar open={Boolean(error)} autoHideDuration={5000} onClose={() => setError("")}>
                <Alert severity="error" onClose={() => setError("")}>{error}</Alert>
            </Snackbar>
            <Snackbar open={Boolean(success)} autoHideDuration={3000} onClose={() => setSuccess("")}>
                <Alert severity="success" onClose={() => setSuccess("")}>{success}</Alert>
            </Snackbar>
        </div>
    );
}

export default withAuth(ChatPage);
