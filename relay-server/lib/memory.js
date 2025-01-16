import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MEMORY_FILE_PATH = join(__dirname, '../../src/utils/memory.json');

export async function saveMemory(memory) {
  try {
    await fs.writeFile(MEMORY_FILE_PATH, JSON.stringify({ memory }, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error saving memory:', error);
    return { success: false, error: error.message };
  }
}

export async function getMemory() {
  try {
    const data = await fs.readFile(MEMORY_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading memory:', error);
    return { memory: {} };
  }
}