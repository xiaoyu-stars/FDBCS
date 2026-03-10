# FDBCS API Server

This branch removes the web frontend and keeps only the backend API service.

## Run locally

**Prerequisites:**
- Node.js
- Python 3

1. Install dependencies:
   `npm install`
2. Start the server:
   `npm run dev`
3. Check health endpoint:
   `curl http://localhost:3000/api/health`
