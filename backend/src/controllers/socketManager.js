import { Server } from "socket.io"
import { saveChatMessage, saveDirectChatMessage } from "./user.controller.js";


let connections = {}
let messages = {}
let timeOnline = {}
let roomHosts = {}
let pendingJoinRequests = {}
let socketToRoom = {}
let socketToUsername = {}

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });


    io.on("connection", (socket) => {

        console.log("SOMETHING CONNECTED")

        const addParticipantToRoom = (path, participantId, participantUsername) => {
            if (!connections[path]) connections[path] = [];
            if (!connections[path].includes(participantId)) {
                connections[path].push(participantId);
            }

            socketToRoom[participantId] = path;
            socketToUsername[participantId] = participantUsername || "Participant";
            timeOnline[participantId] = new Date();

            for (let a = 0; a < connections[path].length; a++) {
                io.to(connections[path][a]).emit("user-joined", participantId, connections[path]);
            }

            connections[path].forEach((id) => {
                io.to(id).emit("participant-name", { socketId: participantId, username: participantUsername || "Participant" });
            });

            io.to(participantId).emit("host-info", {
                hostId: roomHosts[path],
                isHost: roomHosts[path] === participantId
            });

            if (messages[path] !== undefined) {
                for (let a = 0; a < messages[path].length; ++a) {
                    io.to(participantId).emit(
                        "chat-message",
                        messages[path][a]["data"],
                        messages[path][a]["sender"]
                    );
                }
            }
        };

        const emitPendingToHost = (path) => {
            const hostId = roomHosts[path];
            if (!hostId) return;
            const pending = Object.values(pendingJoinRequests[path] || {});
            io.to(hostId).emit("pending-join-requests", pending);
        };

        socket.on("join-call", (payload) => {
            const path = typeof payload === "string" ? payload : payload?.path;
            const username = typeof payload === "object" ? payload?.username : "Participant";
            if (!path) return;
            const normalizedUsername = username || "Participant";
            const existingRoom = connections[path] && connections[path].length > 0;
            const currentHostId = roomHosts[path];

            if (!existingRoom) {
                roomHosts[path] = socket.id;
                socket.join(`meeting:${path}`);
                io.to(socket.id).emit("join-status", { status: "approved", isHost: true });
                addParticipantToRoom(path, socket.id, normalizedUsername);
                return;
            }

            if (connections[path].includes(socket.id)) {
                addParticipantToRoom(path, socket.id, normalizedUsername);
                return;
            }

            const requestId = `${socket.id}-${Date.now()}`;
            if (!pendingJoinRequests[path]) pendingJoinRequests[path] = {};
            pendingJoinRequests[path][requestId] = {
                requestId,
                socketId: socket.id,
                username: normalizedUsername,
                requestedAt: Date.now()
            };

            socketToUsername[socket.id] = normalizedUsername;
            socketToRoom[socket.id] = path;

            io.to(socket.id).emit("join-status", { status: "waiting" });
            if (currentHostId) {
                io.to(currentHostId).emit("join-request", pendingJoinRequests[path][requestId]);
            }
            emitPendingToHost(path);
        });

        socket.on("respond-join-request", ({ path, requestId, decision }) => {
            if (!path || !requestId || !decision) return;
            if (roomHosts[path] !== socket.id) return;
            if (!pendingJoinRequests[path] || !pendingJoinRequests[path][requestId]) return;

            const request = pendingJoinRequests[path][requestId];
            delete pendingJoinRequests[path][requestId];

            if (decision === "accept") {
                io.to(request.socketId).emit("join-status", { status: "approved", isHost: false });
                addParticipantToRoom(path, request.socketId, request.username);
            } else {
                io.to(request.socketId).emit("join-status", {
                    status: "rejected",
                    message: "Host rejected your request"
                });
                delete socketToRoom[request.socketId];
            }

            emitPendingToHost(path);
        })

        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        })

        socket.on("chat-message", (data, sender) => {

            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {


                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }

                    return [room, isFound];

                }, ['', false]);

            if (found === true) {
                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = []
                }

                messages[matchingRoom].push({ 'sender': sender, "data": data, "socket-id-sender": socket.id })
                console.log("message", matchingRoom, ":", sender, data)

                connections[matchingRoom].forEach((elem) => {
                   io.to(elem).emit("chat-message", data, sender)

                })
            }

        })

        socket.on("send-reaction", (emoji, senderName) => {
            const [matchingRoom, found] = Object.entries(connections).reduce(
                ([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                },
                ["", false]
            );

            if (found && connections[matchingRoom]) {
                connections[matchingRoom].forEach((id) => {
                    io.to(id).emit("receive-reaction", {
                        emoji,
                        socketId: socket.id,
                        senderName: senderName || "Participant",
                        id: `${socket.id}-${Date.now()}`
                    });
                });
            }
        });

        socket.on("raise-hand", (senderName) => {
            const [matchingRoom, found] = Object.entries(connections).reduce(
                ([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                },
                ["", false]
            );

            if (found && connections[matchingRoom]) {
                connections[matchingRoom].forEach((id) => {
                    io.to(id).emit("receive-raise-hand", {
                        socketId: socket.id,
                        senderName: senderName || "Participant",
                        id: `${socket.id}-hand-${Date.now()}`
                    });
                });
            }
        });

        socket.on("join-global-chat", () => {
            socket.join("global-chat");
        });

        socket.on("send-global-chat-message", async (payload) => {
            try {
                const savedMessage = await saveChatMessage(payload);
                io.to("global-chat").emit("global-chat-message", savedMessage);
            } catch (error) {
                io.to(socket.id).emit("chat-error", {
                    message: error.message || "Failed to send message."
                });
            }
        });

        socket.on("join-direct-chat", (conversationId) => {
            if (conversationId) {
                socket.join(`direct:${conversationId}`);
            }
        });

        socket.on("send-direct-chat-message", async (payload) => {
            try {
                const savedMessage = await saveDirectChatMessage(payload);
                const directRoom = `direct:${savedMessage.conversationId}`;
                io.to(directRoom).emit("direct-chat-message", savedMessage);
                // Ensure sender always sees the message even if room join was delayed/missed.
                if (!socket.rooms.has(directRoom)) {
                    io.to(socket.id).emit("direct-chat-message", savedMessage);
                }
            } catch (error) {
                io.to(socket.id).emit("chat-error", {
                    message: error.message || "Failed to send direct message."
                });
            }
        });

        socket.on("direct-chat-message-updated", ({ conversationId, messageId, text }) => {
            if (!conversationId || !messageId) return;
            io.to(`direct:${conversationId}`).emit("direct-chat-message-updated", { messageId, text });
        });

        socket.on("direct-chat-message-deleted", ({ conversationId, messageId }) => {
            if (!conversationId || !messageId) return;
            io.to(`direct:${conversationId}`).emit("direct-chat-message-deleted", { messageId });
        });

        socket.on("disconnect", () => {

            var diffTime = Math.abs(timeOnline[socket.id] - new Date())

            var key

            for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))) {

                for (let a = 0; a < v.length; ++a) {
                    if (v[a] === socket.id) {
                        key = k

                        const participantIds = [...connections[key]];
                        const isHostDisconnect = roomHosts[key] === socket.id;

                        if (isHostDisconnect) {
                            participantIds.forEach((participantId) => {
                                if (participantId !== socket.id) {
                                    io.to(participantId).emit("meeting-ended", {
                                        message: "Host left the meeting. Meeting ended."
                                    });
                                }
                            });

                            const pendingEntries = Object.values(pendingJoinRequests[key] || {});
                            pendingEntries.forEach((request) => {
                                io.to(request.socketId).emit("join-status", {
                                    status: "rejected",
                                    message: "Host left the meeting. Meeting ended."
                                });
                                delete socketToRoom[request.socketId];
                            });

                            delete connections[key]
                            delete messages[key]
                            delete roomHosts[key]
                            delete pendingJoinRequests[key]
                            continue;
                        }

                        for (let a = 0; a < participantIds.length; ++a) {
                            io.to(participantIds[a]).emit('user-left', socket.id)
                        }

                        var index = connections[key].indexOf(socket.id)
                        connections[key].splice(index, 1)

                        if (connections[key].length === 0) {
                            delete connections[key]
                            delete messages[key]
                            delete roomHosts[key]
                            delete pendingJoinRequests[key]
                        }
                    }
                }

            }

            Object.entries(pendingJoinRequests).forEach(([roomPath, pendingMap]) => {
                const entries = Object.entries(pendingMap || {});
                entries.forEach(([requestId, request]) => {
                    if (request.socketId === socket.id) {
                        delete pendingJoinRequests[roomPath][requestId];
                    }
                });
                emitPendingToHost(roomPath);
            });

            delete socketToRoom[socket.id];
            delete socketToUsername[socket.id];
            delete timeOnline[socket.id];

        })


    })


    return io;
}

