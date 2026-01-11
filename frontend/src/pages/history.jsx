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
  Divider
} from '@mui/material';

import HomeIcon from '@mui/icons-material/Home';
import VideocamIcon from '@mui/icons-material/Videocam';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

export default function History() {

  const { getHistoryOfUser } = useContext(AuthContext);
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
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <Box sx={{ p: 4, minHeight: "100vh", backgroundColor: "#f5f7fb" }}>

      {/* HEADER */}
      <Box display="flex" alignItems="center" mb={4}>
        <IconButton onClick={() => routeTo("/home")}>
          <HomeIcon />
        </IconButton>
        <Typography variant="h5" fontWeight="bold" ml={1}>
          Meeting History
        </Typography>
      </Box>

      {/* EMPTY STATE */}
      {meetings.length === 0 && (
        <Typography color="text.secondary">
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
                transition: "0.3s",
                "&:hover": {
                  transform: "translateY(-5px)",
                  boxShadow: 6
                }
              }}
            >
              <CardContent>

                <Box display="flex" alignItems="center" mb={1}>
                  <VideocamIcon color="primary" />
                  <Typography ml={1} fontWeight="bold">
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
                  />
                </Box>

                <Box display="flex" alignItems="center">
                  <CalendarMonthIcon fontSize="small" color="action" />
                  <Typography ml={1} color="text.secondary">
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
