import { pool } from './config/db.js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  try {
    const sql = fs.readFileSync('./migrate_wishlist_messages.sql', 'utf8');
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    for (const stmt of statements) {
      try {
        await pool.query(stmt);
        console.log('✓', stmt.substring(0, 60) + '...');
      } catch (err) {
        // Ignore "column already exists" or "table already exists" errors
        if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log('⊘ Skipped (already exists):', stmt.substring(0, 60));
        } else {
          console.error('✗ Error:', err.message, '\n  Statement:', stmt.substring(0, 80));
        }
      }
    }
    
    console.log('\n✅ Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

run();
