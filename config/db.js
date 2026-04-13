import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

let pool;

const connectDB = async () => {
  try {
    pool = mysql.createPool({
      host: process.env.HOST,
      port: process.env.DB_PORT || 4000,
      user: process.env.DB_USERNAME,
      password: process.env.PASSWORD,
      database: process.env.DATABASE,
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
      },
      connectTimeout: 60000,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    // Test the connection
    const connection = await pool.getConnection();
    console.log(`✅ TiDB Connected: ${connection.config.host}`);
    connection.release();
  } catch (error) {
    console.error(`❌ Error connecting to TiDB: ${error.message}`);
    process.exit(1);
  }
};

export { pool };
export default connectDB;
