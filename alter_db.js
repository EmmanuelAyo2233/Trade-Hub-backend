import connectDB, { pool } from './config/db.js';

const run = async () => {
  await connectDB();
  try {
    await pool.query('ALTER TABLE Products ADD COLUMN isActive BOOLEAN DEFAULT TRUE');
    console.log('ALTER done');
  } catch(e) {
    console.log('Already exists or error:', e.message);
  }
  process.exit(0);
};

run();
