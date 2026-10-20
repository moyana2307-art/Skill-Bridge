// SkillBridge AI - Backend server
// Stage 1: minimal Express server with a health-check endpoint.

// Import installed packages
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Loads variables from the .env file into process.env

const app = express();
const PORT = process.env.PORT || 5000;

// CORS: allow the React dev server (runs on port 3000) to call this API.
// Without this, the browser would block the requests for security.
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
  })
);

// Parse incoming JSON request bodies so we can read req.body
app.use(express.json());

// Health-check endpoint: used to confirm the server is running.
// Test with: GET http://localhost:5000/api/health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'SkillBridge AI API is running',
    timestamp: new Date().toISOString(),
  });
});

// Start listening for requests
app.listen(PORT, () => {
  console.log(`SkillBridge AI backend running on http://localhost:${PORT}`);
});
