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
        background: "var(--page-bg)",
        color: "var(--text-main)"
      }}
    >
      <Navbar />

      {/* HEADER */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={4} mt={2}>
        <Box display="flex" alignItems="center">
        <IconButton onClick={() => routeTo("/")}>
          <HomeIcon />
        </IconButton>
        <Typography variant="h5" fontWeight="bold" ml={1} sx={{ color: "var(--text-main)" }}>
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
        <Typography sx={{ color: "var(--text-main)", fontWeight: 700 }}>
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
                backgroundColor: "var(--surface-strong)",
                border: "1px solid var(--glass-border)",
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
                      color: "var(--text-muted)",
                      background: "transparent",
                      border: "1px solid var(--glass-border)"
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Box display="flex" alignItems="center" mb={1}>
                  <VideocamIcon color="primary" />
                  <Typography ml={1} fontWeight="bold" sx={{ color: "var(--text-main)" }}>
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
                    sx={{ fontWeight: 700, color: "var(--text-main)", borderColor: "var(--accent)" }}
                  />
                </Box>

                <Box display="flex" alignItems="center">
                  <CalendarMonthIcon fontSize="small" color="action" />
                  <Typography ml={1} sx={{ color: "var(--text-soft)", fontWeight: 700 }}>
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
