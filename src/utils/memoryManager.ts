import { writeFile } from 'fs/promises';
import { join } from 'path';

export interface Memory {
  [key: string]: any;
}

export class MemoryManager {
  private static instance: MemoryManager;
  private memoryPath: string;

  private constructor() {
    this.memoryPath = join(__dirname, 'memory.json');
  }

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  public async saveMemory(memory: Memory): Promise<void> {
    try {
      await writeFile(this.memoryPath, JSON.stringify({ memory }, null, 2));
    } catch (error) {
      console.error('Error saving memory:', error);
      throw error;
    }
  }
}

export const memoryManager = MemoryManager.getInstance();