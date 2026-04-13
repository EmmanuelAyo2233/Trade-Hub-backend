import bcrypt from 'bcryptjs';
import connectDB, { pool } from './config/db.js';

const run = async () => {
  await connectDB();
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);
    // Check if admin exists
    const [existing] = await pool.query('SELECT * FROM Users WHERE email = ?', ['admin@tradehub.com']);
    if (existing.length === 0) {
      const [res] = await pool.query('INSERT INTO Users (email, password, role) VALUES (?, ?, ?)', ['admin@tradehub.com', hash, 'admin']);
      // We also need an admin profile maybe? Admin relies on Users table only for now.
      console.log('Admin account created with email: admin@tradehub.com and password: admin123');
    } else {
      await pool.query('UPDATE Users SET password = ? WHERE email = ?', [hash, 'admin@tradehub.com']);
      console.log('Admin account updated with password: admin123');
    }
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
};
run();
