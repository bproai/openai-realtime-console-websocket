import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize MySQL table
async function setupMySQL() {
  try {
    const connection = await pool.getConnection();
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS memory_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        memory_data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    connection.release();
    console.log('MySQL table initialized');
  } catch (err) {
    console.error('MySQL setup error:', err);
  }
}

setupMySQL();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MEMORY_FILE_PATH = join(__dirname, 'memory.json');

// MongoDB Connection and Collection Setup
async function setupMongoDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/memory_db');
    console.log('Connected to MongoDB');

    // Explicitly create collection if it doesn't exist
    const db = mongoose.connection.db;
    const collections = await db.listCollections({ name: 'memories' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('memories');
      console.log('Created memories collection');
    }
  } catch (err) {
    console.error('MongoDB setup error:', err);
  }
}

setupMongoDB();

// Memory Schema
const memorySchema = new mongoose.Schema({
  memory: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { 
  timestamps: true,
  collection: 'memories' // Explicitly set collection name
});

const Memory = mongoose.model('Memory', memorySchema);

const app = express();
app.use(cors());
app.use(express.json());

// Memory endpoints
app.post('/memory', async (req, res) => {
  console.log('Incoming request body:', req.body);

  try {
    // File Storage Operation
    const memoryContent = req.body && Object.keys(req.body).length > 0 
      ? { memory: req.body } 
      : { memory: {} };
    
    await fs.writeFile(MEMORY_FILE_PATH, JSON.stringify({ memory: req.body }, null, 2));
    
    // MongoDB Operation - Create new document for each memory save
    await Memory.create({ memory: req.body });

    // MySQL Operation - Log memory save event
    try {
      await pool.execute(
        'INSERT INTO memory_logs (memory_data) VALUES (?)',
        [JSON.stringify(req.body)]
      );
      console.log('Memory event logged to MySQL');
    } catch (mysqlError) {
      console.error('Failed to log to MySQL:', mysqlError);
      // Don't fail the request if MySQL logging fails
    }

    res.json({ success: true });
  } catch (error) {
    const errorMsg = `Failed to save memory: ${error.message}`;
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
    // Get from both sources
    const [fileData, mongoData] = await Promise.all([
      fs.readFile(MEMORY_FILE_PATH, 'utf8').catch(() => JSON.stringify({ memory: {} })),
      Memory.findOne().sort({ createdAt: -1 }).catch(() => null)
    ]);

    // Prefer MongoDB data if available, fallback to file data
    const data = mongoData ? { memory: mongoData.memory } : JSON.parse(fileData);
    res.json(data);
  } catch (error) {
    console.error('Error reading memory:', error);
    res.status(500).json({ memory: {} });
  }
});

const PORT = 8082;
app.listen(PORT, () => {
  console.log(`Memory server running on port ${PORT}`);
});