import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import multer from "multer";
import { connectToSocket } from "./controllers/socketManager.js";
import cors from "cors";
import userRoutes from "./routes/users.routes.js";

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

app.set("port", process.env.PORT || 8000);
app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.use("/api/v1/users", userRoutes);

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            message: `Upload failed: ${err.message}. Try a smaller file (max 50MB).`
        });
    }
    if (err) {
        return res.status(500).json({
            message: err.message || "Unexpected server error."
        });
    }
    return next();
});

const start = async () => {
    try {
        const mongoUri = process.env.MONGO_URL || process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error("Missing MONGO_URL");
        }

        const connectionDb = await mongoose.connect(mongoUri, {
            dbName: process.env.MONGO_DB_NAME || undefined
        });

        console.log(`MONGO connected: ${connectionDb.connection.host}`);
        console.log(`MONGO database: ${connectionDb.connection.name}`);

        app.locals.io = io;

        server.listen(app.get("port"), () => {
            console.log(`Server listening on port ${app.get("port")}`);
        });
    } catch (error) {
        console.error("Failed to start backend:", error.message);
        process.exit(1);
    }
};

start();