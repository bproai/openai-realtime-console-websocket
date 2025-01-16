import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MEMORY_FILE_PATH = join(__dirname, 'memory.json');

const app = express();
app.use(cors());
app.use(express.json());

// Memory endpoints
app.post('/memory', async (req, res) => {
  console.log('Incoming request body:', req.body); // Always log the request body

  try {
    const memoryContent = req.body && Object.keys(req.body).length > 0 
      ? { memory: req.body } 
      : { memory: {} }; // Default to an empty object if no data is provided

    await fs.writeFile(MEMORY_FILE_PATH, JSON.stringify({ memory: req.body }, null, 2));
    res.json({ success: true });
  } catch (error) {
    const errorMsg = `Failed to save memory to ${MEMORY_FILE_PATH}: ${error.message}`;
    console.error(errorMsg);
    if (error.code === 'EACCES') {
      console.error('Permission denied. Check file permissions.');
    } else if (error.code === 'ENOENT') {
      console.error('Directory does not exist.');
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/memory', async (req, res) => {
  try {
    const data = await fs.readFile(MEMORY_FILE_PATH, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading memory:', error);
    res.status(500).json({ memory: {} });
  }
});

const PORT = 8082;
app.listen(PORT, () => {
  console.log(`Memory server running on port ${PORT}`);
});