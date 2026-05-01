/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { Badge, IconButton, TextField } from '@mui/material';
import { Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import styles from "../styles/videoComponent.module.css"; // Ensure your CSS handles the new classes
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import PanToolIcon from '@mui/icons-material/PanTool';
import ShareIcon from '@mui/icons-material/Share';
import server from '../environment';
import ParticipantTile from '../components/ParticipantTile';

const server_url = server;

var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
}
const cameraVideoConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    aspectRatio: { ideal: 1.7777777778 },
    resizeMode: "none"
};

export default function VideoMeetComponent() {

    var socketRef = useRef();
    let socketIdRef = useRef();

    let localVideoref = useRef();

    let [videoAvailable, setVideoAvailable] = useState(true);
    let [audioAvailable, setAudioAvailable] = useState(true);
    let [video, setVideo] = useState([]);
    let [audio, setAudio] = useState();
    let [screen, setScreen] = useState();
    let [showModal, setModal] = useState(false);
    let [screenAvailable, setScreenAvailable] = useState();
    let [messages, setMessages] = useState([])
    let [message, setMessage] = useState("");
    let [newMessages, setNewMessages] = useState(3);
    let [askForUsername, setAskForUsername] = useState(true);
    let [username, setUsername] = useState("");
    // 🔥 NEW FEATURES STATE
let [reactions, setReactions] = useState([]);
let [showReactions, setShowReactions] = useState(false);
let [raiseHandAlerts, setRaiseHandAlerts] = useState([]);
const meetingEmojis = ["😀", "😂", "😍", "😢", "😮", "😡", "👍", "👏", "❤️", "🎉", "🙏", "🔥", "🤝", "🤔", "✅", "👋"];
    const videoRef = useRef([])
    let [videos, setVideos] = useState([])
let [localStreamState, setLocalStreamState] = useState(null);
let [participantNames, setParticipantNames] = useState({});
let [spotlightId, setSpotlightId] = useState(null);
let [joinStatus, setJoinStatus] = useState("idle");
let [joinRejectionMessage, setJoinRejectionMessage] = useState("");
let [isHost, setIsHost] = useState(false);
let [hostId, setHostId] = useState(null);
let [pendingJoinRequests, setPendingJoinRequests] = useState([]);
let [shareStatus, setShareStatus] = useState("");
const websiteLink = "https://smartcon-app.onrender.com";
useEffect(() => {
    console.log("HELLO")
    getPermissions();
}, []);

    let getDislayMedia = () => {
        if (screen) {
            if (navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                    .then(getDislayMediaSuccess)
                    .then((stream) => { })
                    .catch((e) => console.log(e))
            }
        }
    }

    const getPermissions = async () => {
        try {
            const videoPermission = await navigator.mediaDevices.getUserMedia({ video: cameraVideoConstraints });
            if (videoPermission) {
                setVideoAvailable(true);
                console.log('Video permission granted');
            } else {
                setVideoAvailable(false);
                console.log('Video permission denied');
            }

            const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (audioPermission) {
                setAudioAvailable(true);
                console.log('Audio permission granted');
            } else {
                setAudioAvailable(false);
                console.log('Audio permission denied');
            }

            if (navigator.mediaDevices.getDisplayMedia) {
                setScreenAvailable(true);
            } else {
                setScreenAvailable(false);
            }

            if (videoAvailable || audioAvailable) {
                const userMediaStream = await navigator.mediaDevices.getUserMedia({
                    video: videoAvailable ? cameraVideoConstraints : false,
                    audio: audioAvailable
                });
                if (userMediaStream) {
                    window.localStream = userMediaStream;
setLocalStreamState(userMediaStream); // 🔥 IMPORTANT
                    if (localVideoref.current) {
                        localVideoref.current.srcObject = userMediaStream;
                    }
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        if (video !== undefined && audio !== undefined) {
            getUserMedia();
            console.log("SET STATE HAS ", video, audio);
        }
    }, [video, audio])

    let getMedia = () => {
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
    }

    let getUserMediaSuccess = (stream) => {
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) { console.log(e) }

        window.localStream = stream;
setLocalStreamState(stream); // 🔥 IMPORTANT
        // We update the ref, but rendering handles the srcObject via callback refs now
        if(localVideoref.current) localVideoref.current.srcObject = stream

        for (let id in connections) {
            if (id === socketIdRef.current) continue

            connections[id].addStream(window.localStream)

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setVideo(false);
            setAudio(false);

            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            if(localVideoref.current) localVideoref.current.srcObject = window.localStream

            for (let id in connections) {
                connections[id].addStream(window.localStream)
                connections[id].createOffer().then((description) => {
                    connections[id].setLocalDescription(description)
                        .then(() => {
                            socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                        })
                        .catch(e => console.log(e))
                })
            }
        })
    }

    let getUserMedia = () => {
        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({
                video: video ? cameraVideoConstraints : false,
                audio: audio
            })
                .then(getUserMediaSuccess)
                .then((stream) => { })
                .catch((e) => console.log(e))
        } else {
            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { }
        }
    }

    let getDislayMediaSuccess = (stream) => {
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) { console.log(e) }

        window.localStream = stream
        if(localVideoref.current) localVideoref.current.srcObject = stream

        for (let id in connections) {
            if (id === socketIdRef.current) continue

            connections[id].addStream(window.localStream)

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setScreen(false)

            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            if(localVideoref.current) localVideoref.current.srcObject = window.localStream

            getUserMedia()
        })
    }

    let gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message)

        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }))
                            }).catch(e => console.log(e))
                        }).catch(e => console.log(e))
                    }
                }).catch(e => console.log(e))
            }

            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
            }
        }
    }

    let connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false })
        socketRef.current.on('signal', gotMessageFromServer)
       
        socketRef.current.on('connect', () => { // ✋ Listen Raise Hand
            console.log("✅ SOCKET CONNECTED:", socketRef.current.id);

    
socketIdRef.current = socketRef.current.id
            socketRef.current.on("join-status", ({ status, message, isHost: hostPrivilege }) => {
                if (status === "waiting") {
                    setJoinStatus("waiting");
                }
                if (status === "approved") {
                    setJoinStatus("joined");
                    setJoinRejectionMessage("");
                    setIsHost(Boolean(hostPrivilege));
                }
                if (status === "rejected") {
                    setJoinStatus("rejected");
                    setJoinRejectionMessage(message || "Host rejected your request");
                }
            });
            socketRef.current.on("host-info", ({ hostId: nextHostId, isHost: hostPrivilege }) => {
                setHostId(nextHostId || null);
                setIsHost(Boolean(hostPrivilege));
            });
            socketRef.current.on("join-request", (requestPayload) => {
                setPendingJoinRequests((prev) => {
                    const already = prev.some((item) => item.requestId === requestPayload.requestId);
                    return already ? prev : [...prev, requestPayload];
                });
            });
            socketRef.current.on("pending-join-requests", (requests = []) => {
                setPendingJoinRequests(requests);
            });
            socketRef.current.emit('join-call', { path: window.location.pathname, username })
           
// 😀 Listen Reactions
socketRef.current.on("receive-reaction", (reactionPayload, legacySocketId) => {
    if (!reactionPayload) return;
    const normalizedReaction =
        typeof reactionPayload === "string"
            ? {
                  emoji: reactionPayload,
                  socketId: legacySocketId || "",
                  senderName: participantNames[legacySocketId] || "Participant",
                  id: `${legacySocketId || "legacy"}-${Date.now()}`
              }
            : reactionPayload;
    if (normalizedReaction.socketId && normalizedReaction.socketId === socketIdRef.current) {
        return;
    }

    setReactions((prev) => [...prev, normalizedReaction]);

    setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== normalizedReaction.id));
    }, 3000);
});
            socketRef.current.on("participant-name", ({ socketId, username: participantUsername }) => {
                setParticipantNames((prev) => ({ ...prev, [socketId]: participantUsername || "Participant" }));
            });
            socketRef.current.on("receive-raise-hand", (payload) => {
                if (!payload) return;
                setRaiseHandAlerts((prev) => [...prev, payload]);
                setTimeout(() => {
                    setRaiseHandAlerts((prev) => prev.filter((item) => item.id !== payload.id));
                }, 3200);
            });
            socketIdRef.current = socketRef.current.id
            socketRef.current.on("chat-message", (data, sender) => {
    addMessage(data, sender);
});

            socketRef.current.on('user-left', (id) => {
                setVideos((videos) => videos.filter((video) => video.socketId !== id))
                setParticipantNames((prev) => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
            })

            socketRef.current.on('user-joined', (id, clients) => {
                clients.forEach((socketListId) => {

                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections)
                    
                    connections[socketListId].onicecandidate = function (event) {
                        if (event.candidate != null) {
                            socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }))
                        }
                    }

                    connections[socketListId].onaddstream = (event) => {
                        let videoExists = videoRef.current.find(video => video.socketId === socketListId);

                        if (videoExists) {
                            setVideos(videos => {
                                const updatedVideos = videos.map(video =>
                                    video.socketId === socketListId ? { ...video, stream: event.stream } : video
                                );
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        } else {
                            let newVideo = {
                                socketId: socketListId,
                                stream: event.stream,
                                autoplay: true,
                                playsinline: true
                            };
                            setVideos(videos => {
                                const updatedVideos = [...videos, newVideo];
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        }
                    };

                    if (window.localStream !== undefined && window.localStream !== null) {
                        connections[socketListId].addStream(window.localStream)
                    } else {
                        let blackSilence = (...args) => new MediaStream([black(...args), silence()])
                        window.localStream = blackSilence()
                        connections[socketListId].addStream(window.localStream)
                    }
                })

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue
                        try {
                            connections[id2].addStream(window.localStream)
                        } catch (e) { }
                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }))
                                })
                                .catch(e => console.log(e))
                        })
                    }
                }
            })
        })
    }

    let silence = () => {
        let ctx = new AudioContext()
        let oscillator = ctx.createOscillator()
        let dst = oscillator.connect(ctx.createMediaStreamDestination())
        oscillator.start()
        ctx.resume()
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
    }
    
    let black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height })
        canvas.getContext('2d').fillRect(0, 0, width, height)
        let stream = canvas.captureStream()
        return Object.assign(stream.getVideoTracks()[0], { enabled: false })
    }

    let handleVideo = () => setVideo(!video);
    let handleAudio = () => setAudio(!audio);
    
    useEffect(() => {
        if (screen !== undefined) {
            getDislayMedia();
        }
    }, [screen])
    
    let handleScreen = () => setScreen(!screen);

    let handleEndCall = () => {
        try {
            let tracks = localVideoref.current.srcObject.getTracks()
            tracks.forEach(track => track.stop())
        } catch (e) { }
        window.location.href = "/"
    }

    let openChat = () => {
        setModal(true);
        setNewMessages(0);
    }
    let closeChat = () => setModal(false);
    let handleMessage = (e) => setMessage(e.target.value);

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };

    let sendMessage = () => {
        socketRef.current.emit('chat-message', message, username)
        setMessage("");
    }
// ✋ Raise Hand


// 😀 Emoji Reaction
let sendReaction = (emoji) => {
    socketRef.current.emit("send-reaction", emoji, username);

    const localReaction = { 
        emoji, 
        socketId: socketIdRef.current,
        senderName: username || "You",
        id: `${socketIdRef.current}-${Date.now()}`
    };
    setReactions(prev => [...prev, localReaction]);

    setShowReactions(false);

    setTimeout(() => {
        setReactions(prev => prev.filter((r) => r.id !== localReaction.id));
    }, 3000);
};
let sendRaiseHand = () => {
    const handPayload = {
        socketId: socketIdRef.current,
        senderName: username || "You",
        id: `${socketIdRef.current}-hand-${Date.now()}`
    };
    socketRef.current.emit("raise-hand", username);
    setRaiseHandAlerts((prev) => [...prev, handPayload]);
    setTimeout(() => {
        setRaiseHandAlerts((prev) => prev.filter((item) => item.id !== handPayload.id));
    }, 3200);
};
    let connect = () => {
        setAskForUsername(false);
        setJoinStatus("requesting");
        getMedia();
    }

    let handleJoinRequestDecision = (requestId, decision) => {
        if (!socketRef.current) return;
        socketRef.current.emit("respond-join-request", {
            path: window.location.pathname,
            requestId,
            decision
        });
        setPendingJoinRequests((prev) => prev.filter((request) => request.requestId !== requestId));
    };

    let shareMeeting = async () => {
        const meetingCode = window.location.pathname.replace("/", "");
        const whatsappMessage = `Join my meeting on SmartCon.\n\n*Meeting Code : ${meetingCode}*\n\nWebsite Link : ${websiteLink}`;
        const emailMessage = `Join my meeting on SmartCon.\n\nMeeting Code : ${meetingCode}\n\nWebsite Link : ${websiteLink}\n\nThanks from SmartCon Team`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: "SmartCon Meeting",
                    text: whatsappMessage
                });
                setShareStatus("Meeting link shared");
                return;
            } catch (error) {
                if (error?.name !== "AbortError") {
                    setShareStatus("Sharing failed, try copy instead");
                }
            }
        }

        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(emailMessage);
            setShareStatus("Meeting details copied");
            return;
        }

        setShareStatus(`Share this code manually: ${meetingCode}`);
    };

    useEffect(() => {
        if (!shareStatus) return undefined;
        const toastTimer = setTimeout(() => setShareStatus(""), 2200);
        return () => clearTimeout(toastTimer);
    }, [shareStatus]);

    useEffect(() => {
        return () => {
            Object.values(connections).forEach((peer) => {
                try {
                    peer.close();
                } catch (e) {
                    console.log(e);
                }
            });
            connections = {};
            setVideos([]);
            setReactions([]);
            setParticipantNames({});
            setRaiseHandAlerts([]);
        };
    }, []);

    const remoteParticipants = videos.map((videoItem, idx) => ({
        id: videoItem.socketId,
        name: participantNames[videoItem.socketId] || `Participant ${idx + 1}`,
        stream: videoItem.stream,
        isMuted: false
    }));
    const localParticipant = {
        id: "local",
        name: `${username || "You"} (You)`,
        stream: localStreamState || window.localStream || null,
        isMuted: true
    };
    const participants = [localParticipant, ...remoteParticipants];
    const totalCount = participants.length;
    const hasOnlyTwo = totalCount === 2;
    const hasThree = totalCount === 3;
    const isOddLarge = totalCount > 3 && totalCount % 2 !== 0;
    const shouldUseGridAll = totalCount >= 4 && totalCount % 2 === 0;
    const activeSpotlightId = spotlightId || remoteParticipants[0]?.id || "local";
    const spotlightParticipant =
        participants.find((p) => p.id === activeSpotlightId) ||
        remoteParticipants[0] ||
        localParticipant;
    const secondaryParticipant =
        participants.find((p) => p.id !== spotlightParticipant.id) || localParticipant;
    const bigSplitParticipants = hasThree ? remoteParticipants.slice(0, 2) : [];
    const oddGridParticipants = isOddLarge ? remoteParticipants : [];
    useEffect(() => {
        const validIds = new Set(participants.map((p) => p.id));
        if (!spotlightId || !validIds.has(spotlightId)) {
            setSpotlightId(remoteParticipants[0]?.id || "local");
        }
    }, [participants, remoteParticipants, spotlightId]);
    return (
        <div>
            {askForUsername ? (
    <div className={styles.lobbyContainer}>

        <div className={styles.lobbyCard}>

            <h1 className={styles.lobbyTitle}>Join Meeting</h1>
            <p className={styles.lobbySubtitle}>
                Enter your name to start the video conference
            </p>

            <TextField
                label="Your Name"
                variant="outlined"
                value={username}
                onChange={e => setUsername(e.target.value)}
                fullWidth
                InputProps={{ style: { color: "white" } }}
            />

            <Button
                variant="contained"
                className={styles.lobbyBtn}
                onClick={connect}
                disabled={!username}
            >
                Enter Lobby
            </Button>

            <div className={styles.previewBox}>
                <video
                    ref={localVideoref}
                    autoPlay
                    muted
                    playsInline
                />
                <span className={styles.previewLabel}>Camera Preview</span>
            </div>

        </div>

    </div>
) : joinStatus !== "joined" ? (
    <div className={styles.lobbyContainer}>
        <div className={styles.lobbyCard}>
            {joinStatus === "waiting" || joinStatus === "requesting" ? (
                <>
                    <h1 className={styles.lobbyTitle}>Waiting Room</h1>
                    <p className={styles.lobbySubtitle}>Waiting for host approval...</p>
                    <Button
                        variant="outlined"
                        className={styles.lobbyBtn}
                        onClick={handleEndCall}
                        sx={{
                            color: "var(--text-main)",
                            borderColor: "var(--glass-border)",
                            backgroundColor: "var(--surface-soft)"
                        }}
                    >
                        Exit
                    </Button>
                </>
            ) : (
                <>
                    <h1 className={styles.lobbyTitle}>Join Rejected</h1>
                    <p className={styles.lobbySubtitle}>{joinRejectionMessage || "Host rejected your request"}</p>
                    <Button variant="contained" className={styles.lobbyBtn} onClick={handleEndCall}>
                        Back to Home
                    </Button>
                </>
            )}
        </div>
    </div>
) : (


                <div className={styles.meetVideoContainer}>
                    {reactions.length > 0 ? (
                        <div className={styles.topReactionStack}>
                            {reactions.slice(-1).map((reaction) => (
                                <div key={reaction.id} className={styles.topReactionBanner}>
                                    <span className={styles.topReactionEmoji}>{reaction.emoji}</span>
                                    <span className={styles.topReactionSender}>{reaction.senderName}</span>
                                </div>
                            ))}
                        </div>
                    ) : null}
                    {raiseHandAlerts.length > 0 ? (
                        <div className={styles.raiseHandNoticeStack}>
                            {raiseHandAlerts.slice(-1).map((item) => (
                                <div key={item.id} className={styles.raiseHandPopup}>
                                    ✋ {item.senderName} wants to speak
                                </div>
                            ))}
                        </div>
                    ) : null}

                    {/* CHAT OVERLAY */}
                    {showModal ? <div className={styles.chatRoom}>
                        <div className={styles.chatContainer}>
                            <h1>Chat</h1>
                            <div className={styles.chattingDisplay}>
                                {messages.length !== 0 ? messages.map((item, index) => {
                                    return (
                                        <div style={{ marginBottom: "20px" }} key={index}>
                                            <p style={{ fontWeight: "bold" }}>{item.sender}</p>
                                            <p>{item.data}</p>
                                        </div>
                                    )
                                }) : <p>No Messages Yet</p>}
                            </div>
                            <div className={styles.chattingArea}>
                                <TextField
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    id="outlined-basic"
                                    label="Enter your chat"
                                    placeholder="Type your message here..."
                                    variant="outlined"
                                />
                                <Button variant='contained' onClick={sendMessage}>Send</Button>
                            </div>
                        </div>
                    </div> : <></>}

                    {/* CONTROLS */}
                    <div className={styles.buttonContainers}>
                       
                        {/* ✋ Raise Hand */}

                        <IconButton onClick={shareMeeting} title="Share meeting">
                            <ShareIcon />
                        </IconButton>
                        <IconButton onClick={sendRaiseHand} title="Raise hand">
                            <PanToolIcon />
                        </IconButton>

{/* 😀 Emoji Buttons */}
<IconButton onClick={() => setShowReactions(!showReactions)}>
    😀
</IconButton>

                        <IconButton onClick={handleVideo}>
                            {(video === true) ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                        {/* Red End Call Button */}
                        <IconButton onClick={handleEndCall} className={styles.endCallBtn} style={{ color: "white", backgroundColor: "red" }}>
                            <CallEndIcon />
                        </IconButton>
                        <IconButton onClick={handleAudio}>
                            {audio === true ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>
                        {screenAvailable === true ?
                            <IconButton onClick={handleScreen}>
                                {screen === true ? <ScreenShareIcon /> : <StopScreenShareIcon />}
                            </IconButton> : <></>}
                        <Badge badgeContent={newMessages} max={999} color='orange'>
                            <IconButton onClick={() => setModal(!showModal)}>
                                <ChatIcon />
                            </IconButton>
                        </Badge>
                    </div>
                    {shareStatus ? <div className={styles.shareToast}>{shareStatus}</div> : null}
                    {isHost && pendingJoinRequests.length > 0 ? (
                        <div className={styles.pendingJoinPanel}>
                            <h3>Pending Join Requests</h3>
                            {pendingJoinRequests.map((request) => (
                                <div key={request.requestId} className={styles.pendingJoinItem}>
                                    <span>{request.username || request.socketId}</span>
                                    <div>
                                        <Button size="small" variant="contained" onClick={() => handleJoinRequestDecision(request.requestId, "accept")}>
                                            Accept
                                        </Button>
                                        <Button
                                            size="small"
                                            color="error"
                                            variant="outlined"
                                            style={{ marginLeft: "8px" }}
                                            onClick={() => handleJoinRequestDecision(request.requestId, "reject")}
                                        >
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : null}
 {showReactions && (
    <div className={styles.reactionPopup}>
        {meetingEmojis.map((emoji) => (
            <span key={emoji} onClick={() => sendReaction(emoji)}>
                {emoji}
            </span>
        ))}
    </div>
)}
                    {/* =========================================================
                        VIDEO AREA - LOGIC FOR SWAPPING
                       ========================================================= */}

                    {/* 1. PIP VIDEO (The Draggable/Small Video) 
                        Added onClick to toggle the swap state
                    */}
                       
                       
                    {/* 2. MAIN FULL SCREEN VIDEO 
                        We only render the first stream found for full screen context
                        If you have multiple people, you might want to click them in a list to swap.
                    */}
       {/* MAIN VIDEO (FULL SCREEN) */}
<div className={styles.conferenceViewGrid}>
    {totalCount === 1 ? (
        <div className={styles.singleSpotlight}>
            <ParticipantTile
                participantId={localParticipant.id}
                stream={localParticipant.stream}
                name={localParticipant.name}
                isMuted
                reactions={reactions.filter((r) => r.socketId === socketIdRef.current)}
            />
        </div>
    ) : null}

    {hasOnlyTwo ? (
        <>
            <div className={styles.singleSpotlight}>
                <ParticipantTile
                    participantId={spotlightParticipant.id}
                    stream={spotlightParticipant.stream}
                    name={spotlightParticipant.name}
                    isMuted={spotlightParticipant.id === "local"}
                    reactions={reactions.filter((r) =>
                        spotlightParticipant.id === "local"
                            ? r.socketId === socketIdRef.current
                            : r.socketId === spotlightParticipant.id
                    )}
                    onClick={() => setSpotlightId(spotlightParticipant.id)}
                />
            </div>
            <div className={styles.bottomPip}>
                <ParticipantTile
                    participantId={secondaryParticipant.id}
                    stream={secondaryParticipant.stream}
                    name={secondaryParticipant.name}
                    isMuted={secondaryParticipant.id === "local"}
                    reactions={reactions.filter((r) =>
                        secondaryParticipant.id === "local"
                            ? r.socketId === socketIdRef.current
                            : r.socketId === secondaryParticipant.id
                    )}
                    onClick={() => setSpotlightId(secondaryParticipant.id)}
                    compact
                />
            </div>
        </>
    ) : null}

    {hasThree ? (
        <>
            <div className={styles.twoUpRow}>
                {bigSplitParticipants.map((participant) => (
                    <ParticipantTile
                        key={participant.id}
                        participantId={participant.id}
                        stream={participant.stream}
                        name={participant.name}
                        isMuted={false}
                        reactions={reactions.filter((r) => r.socketId === participant.id)}
                        onClick={() => setSpotlightId(participant.id)}
                    />
                ))}
            </div>
            <div className={styles.bottomPip}>
                <ParticipantTile
                    participantId={localParticipant.id}
                    stream={localParticipant.stream}
                    name={localParticipant.name}
                    isMuted
                    reactions={reactions.filter((r) => r.socketId === socketIdRef.current)}
                    onClick={() => setSpotlightId("local")}
                    compact
                />
            </div>
        </>
    ) : null}

    {isOddLarge ? (
        <>
            <div
                className={styles.dynamicGrid}
                style={{ gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(oddGridParticipants.length || 1))}, minmax(0, 1fr))` }}
            >
                {oddGridParticipants.map((participant) => (
                    <ParticipantTile
                        key={participant.id}
                        participantId={participant.id}
                        stream={participant.stream}
                        name={participant.name}
                        isMuted={false}
                        reactions={reactions.filter((r) => r.socketId === participant.id)}
                        onClick={() => setSpotlightId(participant.id)}
                    />
                ))}
            </div>
            <div className={styles.bottomPip}>
                <ParticipantTile
                    participantId={localParticipant.id}
                    stream={localParticipant.stream}
                    name={localParticipant.name}
                    isMuted
                    reactions={reactions.filter((r) => r.socketId === socketIdRef.current)}
                    onClick={() => setSpotlightId("local")}
                    compact
                />
            </div>
        </>
    ) : null}

    {shouldUseGridAll ? (
        <div
            className={styles.dynamicGrid}
            style={{ gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(participants.length || 1))}, minmax(0, 1fr))` }}
        >
            {participants.map((participant) => (
                <ParticipantTile
                    key={participant.id}
                    participantId={participant.id}
                    stream={participant.stream}
                    name={participant.name}
                    isMuted={participant.id === "local"}
                    reactions={reactions.filter((r) =>
                        participant.id === "local"
                            ? r.socketId === socketIdRef.current
                            : r.socketId === participant.id
                    )}
                    onClick={() => setSpotlightId(participant.id)}
                />
            ))}
        </div>
    ) : null}
</div>
                </div>
            )}
        </div>
    )
}