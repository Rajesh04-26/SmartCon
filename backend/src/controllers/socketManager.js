import { Server } from "socket.io"
import { saveChatMessage, saveDirectChatMessage } from "./user.controller.js";


let connections = {}
let messages = {}
let timeOnline = {}

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

        socket.on("join-call", (payload) => {
            const path = typeof payload === "string" ? payload : payload?.path;
            const username = typeof payload === "object" ? payload?.username : "Participant";
            if (!path) return;

            if (connections[path] === undefined) {
                connections[path] = []
            }
            connections[path].push(socket.id)

            timeOnline[socket.id] = new Date();

            // connections[path].forEach(elem => {
            //     io.to(elem)
            // })

            for (let a = 0; a < connections[path].length; a++) {
                io.to(connections[path][a]).emit("user-joined", socket.id, connections[path])
            }
            connections[path].forEach((id) => {
                io.to(id).emit("participant-name", { socketId: socket.id, username: username || "Participant" });
            });

            if (messages[path] !== undefined) {
                for (let a = 0; a < messages[path].length; ++a) {
                   io.to(socket.id).emit("chat-message",
    messages[path][a]['data'],
    messages[path][a]['sender']
)

                }
            }

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
                io.to(`direct:${savedMessage.conversationId}`).emit("direct-chat-message", savedMessage);
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

                        for (let a = 0; a < connections[key].length; ++a) {
                            io.to(connections[key][a]).emit('user-left', socket.id)
                        }

                        var index = connections[key].indexOf(socket.id)

                        connections[key].splice(index, 1)


                        if (connections[key].length === 0) {
                            delete connections[key]
                        }
                    }
                }

            }


        })


    })


    return io;
}

