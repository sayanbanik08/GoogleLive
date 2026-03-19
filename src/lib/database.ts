import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'simulations.db');

export interface SimulationData {
  userId: string;
  startTime: string;
  totalDurationHours: number;
  startPos: [number, number];
  endPos: [number, number];
  roadPath: [number, number][];
  isActive: boolean;
  isReversed: boolean;
  createdAt: string;
}

export const readDB = (): SimulationData[] => {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return [];
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Database Read Error:', error);
    return [];
  }
};

export const writeDB = (data: SimulationData[]) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Database Write Error:', error);
  }
};

export const getActiveSimulation = (userId: string = 'default') => {
  const db = readDB();
  return db.find(s => s.userId === userId && s.isActive) || null;
};

export const startSimulation = (data: Omit<SimulationData, 'createdAt' | 'isActive'>) => {
  const db = readDB();
  // Deactivate others
  const updatedDB = db.map(s => s.userId === data.userId ? { ...s, isActive: false } : s);
  
  const newSim: SimulationData = {
    ...data,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  
  updatedDB.push(newSim);
  writeDB(updatedDB);
  return newSim;
};

export const stopSimulation = (userId: string = 'default') => {
  const db = readDB();
  const updatedDB = db.map(s => s.userId === userId ? { ...s, isActive: false } : s);
  writeDB(updatedDB);
};
