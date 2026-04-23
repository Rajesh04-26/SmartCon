import React, { useContext, useState } from 'react'
import withAuth from '../utils/withAuth'
import { useNavigate } from 'react-router-dom'
import "../App.css";
import { Button, TextField } from '@mui/material';
import { AuthContext } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

function HomeComponent() {

    const navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");
    const { addToUserHistory } = useContext(AuthContext);

    const handleJoinVideoCall = async () => {
        if (!meetingCode) return;
        await addToUserHistory(meetingCode);
        navigate(`/${meetingCode}`);
    };

    return (
        <div className="pageWithNavbar smartconPage">
            <Navbar />

            {/* MAIN SECTION */}
            <div className="meetContainer">
                <div className="leftPanel">
                    <h1>Smart Video Conferencing</h1>
                    <p>Connect. Collaborate. Communicate — smarter.</p>

                    <div className="joinBox">
                       <TextField
    label="Enter Meeting Code"
    variant="outlined"
    fullWidth
    value={meetingCode}
    onChange={(e) => setMeetingCode(e.target.value)}
    sx={{
        input: { color: "var(--text-main)" },
        label: { color: "var(--text-muted)" },
        "& label.Mui-focused": {
            color: "var(--accent)",
        },
        "& .MuiOutlinedInput-root": {
            backgroundColor: "var(--surface-strong)",
            borderRadius: "12px",
            "& fieldset": {
                borderColor: "var(--glass-border)",
            },
            "&:hover fieldset": {
                borderColor: "var(--primary)",
            },
            "&.Mui-focused fieldset": {
                borderColor: "var(--accent)",
            },
        },
    }}
/>

                       <Button
    variant="contained"
    onClick={handleJoinVideoCall}
    sx={{
        mt: 1,
        py: 1.4,
        fontWeight: 600,
        borderRadius: "999px",
        background: "var(--gradient-btn)",
        boxShadow: "var(--soft-shadow)",
        textTransform: "none",
        "&:hover": {
            background: "var(--gradient-btn)",
            filter: "brightness(1.04)",
            boxShadow: "var(--elevated-shadow)",
        },
    }}
>
    Join 
</Button>

                    </div>
                </div>

                <div className="rightPanel slideImage">
                    <img src="/logo3.png" alt="SMARTCON" />
                </div>
            </div>
        </div>
    );
}

export default withAuth(HomeComponent);
