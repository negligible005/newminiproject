const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const ADMIN_PORT = 3001;
const API_URL = `http://localhost:${process.env.PORT || 3000}/api`;

app.use(cors());
app.use(express.static(path.join(__dirname, '/')));

// Serve the admin panel at the root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-panel.html'));
});

app.listen(ADMIN_PORT, () => {
    console.log(`\n🚀 UNIO Admin Panel is running on http://localhost:${ADMIN_PORT}`);
    console.log(`🔗 Connected to Main API at http://localhost:${process.env.PORT || 3000}\n`);
});
