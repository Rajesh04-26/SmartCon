import React, { useEffect, useRef, useState } from "react";
import styles from "../styles/videoComponent.module.css";

function ParticipantTile({ participantId, stream, name, isMuted, onClick, reactions = [], compact = false }) {
    const videoRef = useRef(null);
    const [isSpeaking, setIsSpeaking] = useState(false);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream || null;
        }
    }, [stream]);

    useEffect(() => {
        if (!stream || isMuted) return undefined;
        const audioTracks = stream.getAudioTracks();
        if (!audioTracks.length) return undefined;

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let rafId;
        const checkVolume = () => {
            analyser.getByteFrequencyData(dataArray);
            const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            setIsSpeaking(avg > 20);
            rafId = requestAnimationFrame(checkVolume);
        };
        checkVolume();

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            source.disconnect();
            analyser.disconnect();
            audioContext.close();
        };
    }, [stream, isMuted]);

    return (
        <div
            className={`${styles.participantTile} ${isSpeaking ? styles.activeSpeaker : ""} ${compact ? styles.compactTile : ""}`}
            onClick={onClick}
        >
            <video ref={videoRef} autoPlay playsInline muted={isMuted} className={styles.tileVideo} />
            <div className={styles.participantOverlay}>{name}</div>
            <div className={styles.participantReactionStack}>
                {reactions.slice(-3).map((reaction) => (
                    <div key={reaction.id} className={styles.participantReactionBubble}>
                        <span>{reaction.emoji}</span>
                        <small>{reaction.senderName}</small>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ParticipantTile;
