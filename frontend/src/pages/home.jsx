import React, { useContext, useState } from 'react'
import withAuth from '../utils/withAuth'
import { useNavigate } from 'react-router-dom'
import "../App.css";
import { Button, IconButton, TextField } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import { AuthContext } from '../contexts/AuthContext';

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
        <>
            {/* NAVBAR */}
            <div className="navBar">
                <h2 className="logo">SMARTCON</h2>

                <div className="navActions">
                    <IconButton onClick={() => navigate("/history")} color="inherit">
                        <RestoreIcon />
                    </IconButton>
                    <span className="historyText">History</span>

                    <Button
                        className="logoutBtn"
                        onClick={() => {
                            localStorage.removeItem("token");
                            navigate("/auth");
                        }}
                    >
                        Logout
                    </Button>
                </div>
            </div>

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
        input: { color: "#f8fafc" },
        label: { color: "#94a3b8" },
        "& label.Mui-focused": {
            color: "#22d3ee",
        },
        "& .MuiOutlinedInput-root": {
            backgroundColor: "rgba(15, 23, 42, 0.8)",
            borderRadius: "12px",
            "& fieldset": {
                borderColor: "rgba(255,255,255,0.2)",
            },
            "&:hover fieldset": {
                borderColor: "#6366f1",
            },
            "&.Mui-focused fieldset": {
                borderColor: "#22d3ee",
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
        background: "linear-gradient(135deg, #4f46e5, #06b6d4)",
        boxShadow: "0 10px 25px rgba(99,102,241,0.4)",
        textTransform: "none",
        "&:hover": {
            background: "linear-gradient(135deg, #4338ca, #0891b2)",
            boxShadow: "0 15px 30px rgba(99,102,241,0.6)",
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
        </>
    );
}

export default withAuth(HomeComponent);
