// Load environment variables from the .env file into process.env
require("dotenv").config();

// Import required packages
const express = require("express"); // Web server framework
const cors = require("cors");       // Allows frontend (React) to connect
const { Pool } = require("pg");     // PostgreSQL client
const authRoutes = require('./routes/authRoutes'); // Import auth routes

// Create an Express app instance
const app = express();

// Enable CORS so your React frontend can call this API
app.use(cors());

// Allows your API to accept JSON request bodies
app.use(express.json());

app.use('/auth', authRoutes);

/*
  Create a PostgreSQL connection pool.
  - connectionString pulls DATABASE_URL from .env
  - ssl is set to avoid certificate issues on hosted PostgreSQL
*/
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Simple route to test if backend is working
app.get("/", (req, res) => {
  res.json({ message: "Backend is running on Windows!" });
});

// Choose a port for the server
const PORT = 3000;

// Start the server and listen for requests
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
