import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom';

import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Grid,
  Chip,
  Divider,
  Button
} from '@mui/material';

import HomeIcon from '@mui/icons-material/Home';
import VideocamIcon from '@mui/icons-material/Videocam';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CloseIcon from '@mui/icons-material/Close';
import withAuth from '../utils/withAuth';
import Navbar from '../components/Navbar';

function History() {

  const { getHistoryOfUser, clearHistory, deleteHistoryItem } = useContext(AuthContext);
  const [meetings, setMeetings] = useState([]);
  const routeTo = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await getHistoryOfUser();
        setMeetings(history);
      } catch (err) {
        console.log(err);
      }
    };
    fetchHistory();
  }, [getHistoryOfUser]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleClearHistory = async () => {
    try {
      await clearHistory();
      setMeetings([]);
    } catch (err) {
      console.log(err);
    }
  };

  const handleDeleteItem = async (historyId) => {
    try {
      await deleteHistoryItem(historyId);
      setMeetings((prev) => prev.filter((item) => item._id !== historyId));
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <Box
      sx={{
        p: 4,
        minHeight: "100vh",
        pt: 12,
        background:
          "radial-gradient(circle at top left, rgba(99,102,241,0.25), transparent 45%), radial-gradient(circle at bottom right, rgba(6,182,212,0.25), transparent 45%), linear-gradient(180deg, #020617, #0f172a)",
        color: "#f8fafc"
      }}
    >
      <Navbar />

      {/* HEADER */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={4} mt={2}>
        <Box display="flex" alignItems="center">
        <IconButton onClick={() => routeTo("/")}>
          <HomeIcon />
        </IconButton>
        <Typography variant="h5" fontWeight="bold" ml={1} sx={{ color: "#f8fafc" }}>
          Meeting History
        </Typography>
        </Box>
        <Button
          variant="outlined"
          color="error"
          onClick={handleClearHistory}
          sx={{ borderRadius: "999px", fontWeight: 700, textTransform: "none" }}
        >
          Clear History
        </Button>
      </Box>

      {/* EMPTY STATE */}
      {meetings.length === 0 && (
        <Typography sx={{ color: "#f8fafc", fontWeight: 700 }}>
          No meeting history found.
        </Typography>
      )}

      {/* HISTORY LIST */}
      <Grid container spacing={3}>
        {meetings.map((e, i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <Card
              elevation={3}
              sx={{
                borderRadius: 3,
                backgroundColor: "rgba(15, 23, 42, 0.92)",
                transition: "0.3s",
                "&:hover": {
                  transform: "translateY(-5px)",
                  boxShadow: 6
                }
              }}
            >
              <CardContent>
                <Box display="flex" justifyContent="flex-end">
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteItem(e._id)}
                    sx={{
                      color: "rgba(248,250,252,0.75)",
                      background: "transparent",
                      border: "1px solid rgba(248,250,252,0.2)"
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Box display="flex" alignItems="center" mb={1}>
                  <VideocamIcon color="primary" />
                  <Typography ml={1} fontWeight="bold" sx={{ color: "#f8fafc" }}>
                    Meeting
                  </Typography>
                </Box>

                <Divider sx={{ mb: 2 }} />

                <Box display="flex" alignItems="center" mb={1}>
                  <Chip
                    label={`Code: ${e.meetingCode}`}
                    color="primary"
                    variant="outlined"
                    size="small"
                    sx={{ fontWeight: 700, color: "#f8fafc", borderColor: "#60a5fa" }}
                  />
                </Box>

                <Box display="flex" alignItems="center">
                  <CalendarMonthIcon fontSize="small" color="action" />
                  <Typography ml={1} sx={{ color: "#e2e8f0", fontWeight: 700 }}>
                    {formatDate(e.date)}
                  </Typography>
                </Box>

              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

    </Box>
  );
}

export default withAuth(History);
