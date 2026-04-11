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
import server from '../environment';

const server_url = server;

var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
}

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
    // NEW STATE FOR SWAPPING
    let [videoSwap, setVideoSwap] = useState(false);
let mainVideoRef = useRef();
let pipVideoRef = useRef();
    const videoRef = useRef([])
    let [videos, setVideos] = useState([])
let [localStreamState, setLocalStreamState] = useState(null);
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
            const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true });
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
                const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: videoAvailable, audio: audioAvailable });
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
            navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
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
            socketRef.current.emit('join-call', window.location.pathname)
           
// 😀 Listen Reactions
socketRef.current.on("receive-reaction", (emoji, socketId) => {
    setReactions(prev => [...prev, { 
        emoji, 
        socketId,   // ✅ IMPORTANT
        id: Date.now() 
    }]);

    setTimeout(() => {
        setReactions(prev => prev.slice(1));
    }, 3000);
});
            socketIdRef.current = socketRef.current.id
            socketRef.current.on("chat-message", (data, sender) => {
    addMessage(data, sender);
});

            socketRef.current.on('user-left', (id) => {
                setVideos((videos) => videos.filter((video) => video.socketId !== id))
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

    setReactions(prev => [...prev, { 
        emoji, 
        socketId: socketIdRef.current,  // ✅ IMPORTANT
        id: Date.now() 
    }]);

    setShowReactions(false);

    setTimeout(() => {
        setReactions(prev => prev.slice(1));
    }, 3000);
};
    let connect = () => {
        setAskForUsername(false);
        getMedia();
    }

    // --- HELPER TO DETERMINE STREAMS FOR SWAPPING ---
    // If videoSwap is false: Main = Remote[0], PIP = Local
    // If videoSwap is true:  Main = Local, PIP = Remote[0]
    
    // We default the main view to the first remote video found.
    // If no remote video, we can show local or black.
    const hasRemote = videos.length > 0;

// MAIN VIDEO
const mainStream = videoSwap
  ? localStreamState
  : (hasRemote ? videos[0].stream : null);

// PIP VIDEO
const pipStream = videoSwap
  ? (hasRemote ? videos[0].stream : localStreamState)
  : localStreamState;
useEffect(() => {
    if (pipVideoRef.current) {
        pipVideoRef.current.srcObject = pipStream || window.localStream || null;
    }

    if (mainVideoRef.current) {
        mainVideoRef.current.srcObject = mainStream || null;
    }
}, [localStreamState, videos, videoSwap]);
    return (
        <div>
           {askForUsername === true ?
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
:


                <div className={styles.meetVideoContainer}>

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
                                <TextField value={message} onChange={(e) => setMessage(e.target.value)} id="outlined-basic" label="Enter Your chat" variant="outlined" />
                                <Button variant='contained' onClick={sendMessage}>Send</Button>
                            </div>
                        </div>
                    </div> : <></>}

                    {/* CONTROLS */}
                    <div className={styles.buttonContainers}>
                       
                        {/* ✋ Raise Hand */}

{/* 😀 Emoji Buttons */}
<IconButton onClick={() => setShowReactions(!showReactions)} style={{ color: "white" }}>
    😀
</IconButton>

                        <IconButton onClick={handleVideo} style={{ color: "white" }}>
                            {(video === true) ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                        {/* Red End Call Button */}
                        <IconButton onClick={handleEndCall} className={styles.endCallBtn} style={{ color: "white", backgroundColor: "red" }}>
                            <CallEndIcon />
                        </IconButton>
                        <IconButton onClick={handleAudio} style={{ color: "white" }}>
                            {audio === true ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>
                        {screenAvailable === true ?
                            <IconButton onClick={handleScreen} style={{ color: "white" }}>
                                {screen === true ? <ScreenShareIcon /> : <StopScreenShareIcon />}
                            </IconButton> : <></>}
                        <Badge badgeContent={newMessages} max={999} color='orange'>
                            <IconButton onClick={() => setModal(!showModal)} style={{ color: "white" }}>
                                <ChatIcon />
                            </IconButton>
                        </Badge>
                    </div>
 {showReactions && (
    <div className={styles.reactionPopup}>
        <span onClick={() => sendReaction("👍")}>👍</span>
        <span onClick={() => sendReaction("😂")}>😂</span>
        <span onClick={() => sendReaction("👏")}>👏</span>
        <span onClick={() => sendReaction("❤️")}>❤️</span>
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
<div className={styles.conferenceView}>
    <video
        ref={mainVideoRef}
        autoPlay
        playsInline
        muted={videoSwap}
        className={styles.mainVideo}
    />

    {/* Remote reactions */}
    <div className={styles.reactionOverlay}>
        {reactions
            .filter(r => r.socketId !== socketIdRef.current)
            .map(r => (
                <span key={r.id} className={styles.emoji}>
                    {r.emoji}
                </span>
            ))}
    </div>
</div>

{/* PIP VIDEO */}
<div className={styles.pipContainer}>
    <video
        ref={pipVideoRef}
        autoPlay
        playsInline
        muted
        onClick={() => setVideoSwap(!videoSwap)}
        className={styles.pipVideo}
    />

    {/* Your reactions */}
    <div className={styles.reactionOverlay}>
        {reactions
            .filter(r => r.socketId === socketIdRef.current)
            .map(r => (
                <span key={r.id} className={styles.emoji}>
                    {r.emoji}
                </span>
            ))}
    </div>
</div>
                </div>
            }
            
    
        </div>
    )
}