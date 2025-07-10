const express = require('express');
const cors = require('cors');
const initConnection = require('./db');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

initConnection();

app.use('/api', require('./routes/mainRoutes'));

app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);
});