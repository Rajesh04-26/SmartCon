# SmartCon

SmartCon is a full-stack real-time communication platform with video meetings, global and direct chat, authentication, and user activity history.

## Tech Stack

- Frontend: React (`react-scripts`), React Router, Socket.IO Client, Axios, Framer Motion, MUI
- Backend: Node.js, Express, Socket.IO, MongoDB (Mongoose), Multer, Cloudinary
- Database: MongoDB

## Project Structure
```text
SmartCon/
  backend/    # Express + Socket.IO API server
  frontend/   # React web app
```
## Features
- Video meeting rooms with real-time signaling
- Global chat and one-to-one direct chat
- Friend request and friend management flow
- User authentication and profile management
- Avatar/media upload support
- Activity history tracking

## Local Setup

### 1) Clone and install dependencies

```bash
git clone https://github.com/Rajesh04-26/SmartCon.git
cd SmartCon

cd backend
npm install

cd ../frontend
npm install
```

### 2) Configure environment variables

Create `backend/.env`:

```env
PORT=8000
MONGO_URL=your_mongodb_connection_string
MONGO_DB_NAME=smartcon

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

Create `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:8000
```

### 3) Run backend

```bash
cd backend
npm run dev
```

### 4) Run frontend

```bash
cd frontend
npm start
```

Frontend runs on `http://localhost:3000` by default.

## API Base Path

Backend routes are mounted at:

`/api/v1/users`

Example:

- `POST /api/v1/users/register`
- `POST /api/v1/users/login`

## Deployment on Render (Frontend and Backend separately)

### A) Backend (Render Web Service)

1. Render Dashboard -> **New +** -> **Web Service**
2. Connect repo: `Rajesh04-26/SmartCon`
3. Set:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add environment variables:
   - `MONGO_URL` (or `MONGO_URI`)
   - `MONGO_DB_NAME` (optional)
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
5. Deploy and copy backend URL

### B) Frontend (Render Static Site)

1. Render Dashboard -> **New +** -> **Static Site**
2. Connect same repo
3. Set:
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `build`
4. Add environment variable:
   - `REACT_APP_API_URL=https://your-backend-service.onrender.com`
5. Deploy

### C) Verify

- Open frontend URL
- Register/login
- Test chat/video flows
- Check backend logs on Render for incoming API/socket traffic

## Available Scripts

### Backend (`backend/package.json`)

- `npm run dev` - Start backend with nodemon
- `npm start` - Start backend with node

### Frontend (`frontend/package.json`)

- `npm start` - Start React dev server
- `npm run build` - Create production build
- `npm test` - Run tests

## Notes

- Ensure MongoDB allows connections from Render IPs (or use Atlas with proper network access).
- Set `REACT_APP_API_URL` to your deployed backend URL in production.
- Keep secret keys only in environment variables (never commit them to git).
