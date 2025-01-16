import express from 'express';
import cors from 'cors';
import { RealtimeRelay } from './lib/relay.js';
import { saveMemory, getMemory } from './lib/memory.js';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error(
    `Environment variable "OPENAI_API_KEY" is required.\n` +
      `Please set it in your .env file.`
  );
  process.exit(1);
}

const PORT = parseInt(process.env.PORT) || 8081;
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Memory endpoints
app.post('/api/memory', async (req, res) => {
  try {
    const result = await saveMemory(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/memory', async (req, res) => {
  try {
    const memory = await getMemory();
    res.json(memory);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Initialize realtime relay
const relay = new RealtimeRelay(OPENAI_API_KEY);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  relay.listen(PORT + 1);
  console.log(`Relay server running on port ${PORT + 1}`);
});
