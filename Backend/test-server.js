const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Test server OK' });
});

app.get('/test', (req, res) => {
  res.json({ test: true, time: new Date() });
});

const PORT = 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server on port ${PORT}`);
});
