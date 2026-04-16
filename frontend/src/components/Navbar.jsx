import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import {
    Avatar,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Menu,
    MenuItem,
    TextField,
    Typography
} from "@mui/material";

const githubAvatars = [
    "https://api.dicebear.com/8.x/identicon/svg?seed=blue-symbol",
    "https://api.dicebear.com/8.x/identicon/svg?seed=github-1",
    "https://api.dicebear.com/8.x/identicon/svg?seed=github-2",
    "https://api.dicebear.com/8.x/identicon/svg?seed=github-3",
    "https://api.dicebear.com/8.x/identicon/svg?seed=github-4",
    "https://api.dicebear.com/8.x/identicon/svg?seed=github-5",
    "https://api.dicebear.com/8.x/identicon/svg?seed=github-6",
    "https://api.dicebear.com/8.x/identicon/svg?seed=github-7",
    "https://api.dicebear.com/8.x/identicon/svg?seed=github-8",
    "https://api.dicebear.com/8.x/identicon/svg?seed=github-9",
    "https://api.dicebear.com/8.x/identicon/svg?seed=github-10",
    "https://api.dicebear.com/8.x/identicon/svg?seed=github-11",
    "https://api.dicebear.com/8.x/identicon/svg?seed=github-12",
    "https://api.dicebear.com/8.x/identicon/svg?seed=github-13",
    "https://api.dicebear.com/8.x/identicon/svg?seed=github-14",
    "https://api.dicebear.com/8.x/identicon/svg?seed=github-15"
];

const Navbar = () => {
    const navigate = useNavigate();
    const { userData, logout, updateProfile, updateAvatar, uploadChatMedia, deleteAccount } = useContext(AuthContext);
    const isLoggedIn = Boolean(localStorage.getItem("token"));
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [form, setForm] = useState({
        name: userData?.user?.name || "",
        bio: userData?.user?.bio || "",
        gender: userData?.user?.gender || "prefer_not_say",
        location: userData?.user?.location || ""
    });

    const openMenu = (e) => setMenuAnchor(e.currentTarget);
    const closeMenu = () => setMenuAnchor(null);

    const handleProfileSave = async () => {
        await updateProfile(form);
        setProfileOpen(false);
    };

    const handleAvatarUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const uploaded = await uploadChatMedia(file);
        await updateAvatar(uploaded.mediaUrl, "upload");
    };

    return (
        <div className="navBar fixedNavBar">
            <h2 className="logo" onClick={() => navigate("/")}>SMARTCON</h2>
            <div className="navActions">
                <button className="navLinkBtn" onClick={() => navigate("/")}>Home</button>
                <button className="navLinkBtn" onClick={() => navigate("/chat")}>Chat</button>
                <button className="navLinkBtn" onClick={() => navigate("/home")}>SmartCon</button>
                <button className="navLinkBtn" onClick={() => navigate("/history")}>History</button>
                {!isLoggedIn ? (
                    <>
                        <button className="navLinkBtn" onClick={() => navigate("/auth")}>Login</button>
                        <button className="navLinkBtn" onClick={() => navigate("/auth")}>Register</button>
                    </>
                ) : (
                    <>
                        <Avatar
                            src={userData?.user?.avatar}
                            className="navAvatar"
                            onClick={openMenu}
                        />
                        <Menu
                            anchorEl={menuAnchor}
                            open={Boolean(menuAnchor)}
                            onClose={closeMenu}
                            PaperProps={{
                                sx: {
                                    background: "rgba(2, 6, 23, 0.72)",
                                    color: "#f8fafc",
                                    backdropFilter: "blur(12px)",
                                    border: "1px solid rgba(148,163,184,0.25)"
                                }
                            }}
                        >
                            <MenuItem disabled>
                                {userData?.user?.name || "Profile"}
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    closeMenu();
                                    setForm({
                                        name: userData?.user?.name || "",
                                        bio: userData?.user?.bio || "",
                                        gender: userData?.user?.gender || "prefer_not_say",
                                        location: userData?.user?.location || ""
                                    });
                                    setProfileOpen(true);
                                }}
                            >
                                Profile
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    closeMenu();
                                    logout();
                                }}
                            >
                                Sign Out
                            </MenuItem>
                        </Menu>
                    </>
                )}
            </div>
            <Dialog
                open={profileOpen}
                onClose={() => setProfileOpen(false)}
                fullWidth
                maxWidth="sm"
                PaperProps={{
                    sx: {
                        background: "linear-gradient(180deg, #020617, #0f172a)",
                        color: "#f8fafc",
                        border: "1px solid rgba(148,163,184,0.3)"
                    }
                }}
            >
                <DialogTitle>Edit Profile</DialogTitle>
                <DialogContent>
                    <TextField
                        margin="dense"
                        label="Name"
                        fullWidth
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                        sx={{ mt: 1 }}
                        InputLabelProps={{ sx: { color: "#cbd5e1", fontWeight: 700 } }}
                        InputProps={{ sx: { color: "#fff", fontWeight: 700 } }}
                    />
                    <TextField
                        margin="dense"
                        label="Bio"
                        fullWidth
                        multiline
                        minRows={2}
                        value={form.bio}
                        onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                        InputLabelProps={{ sx: { color: "#cbd5e1", fontWeight: 700 } }}
                        InputProps={{ sx: { color: "#fff", fontWeight: 700 } }}
                    />
                    <TextField
                        margin="dense"
                        label="Gender"
                        select
                        fullWidth
                        value={form.gender}
                        onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value }))}
                        InputLabelProps={{ sx: { color: "#cbd5e1", fontWeight: 700 } }}
                        InputProps={{ sx: { color: "#fff", fontWeight: 700 } }}
                    >
                        <MenuItem value="male">Male</MenuItem>
                        <MenuItem value="female">Female</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                        <MenuItem value="prefer_not_say">Prefer Not To Say</MenuItem>
                    </TextField>
                    <TextField
                        margin="dense"
                        label="Location"
                        fullWidth
                        value={form.location}
                        onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                        InputLabelProps={{ sx: { color: "#cbd5e1", fontWeight: 700 } }}
                        InputProps={{ sx: { color: "#fff", fontWeight: 700 } }}
                    />
                    <Typography sx={{ mt: 1.2, color: "#ffffff", fontWeight: 800 }}>
                        Friends Count: {userData?.user?.friendsCount || 0}
                    </Typography>
                    <Button sx={{ mt: 1 }} variant="outlined" component="label" size="small">
                        Upload Avatar
                        <input hidden type="file" accept="image/*" onChange={handleAvatarUpload} />
                    </Button>
                    <div className="avatarGrid" style={{ marginTop: 10 }}>
                        {githubAvatars.map((avatarUrl) => (
                            <Avatar
                                key={avatarUrl}
                                src={avatarUrl}
                                className="avatarOption"
                                onClick={() => updateAvatar(avatarUrl, "preset")}
                            />
                        ))}
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button size="small" onClick={() => setProfileOpen(false)}>Cancel</Button>
                    <Button size="small" variant="contained" color="error" onClick={async () => {
                        if (window.confirm("Delete account permanently?")) {
                            await deleteAccount();
                        }
                    }}>
                        Delete Account
                    </Button>
                    <Button size="small" variant="contained" onClick={handleProfileSave}>Save</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default Navbar;
