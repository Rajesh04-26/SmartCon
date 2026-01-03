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
                            onChange={e => setMeetingCode(e.target.value)}
                            InputProps={{ style: { color: "white" } }}
                        />
                        <Button
                            variant="contained"
                            className="joinBtn"
                            onClick={handleJoinVideoCall}
                        >
                            Join Meeting
                        </Button>
                    </div>
                </div>

                <div className="rightPanel">
                    <img src="/logo3.png" alt="SMARTCON" />
                </div>
            </div>
        </>
    );
}

export default withAuth(HomeComponent);
