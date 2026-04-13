import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const runInit = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USERNAME,
            password: process.env.PASSWORD,
            ssl: {
                minVersion: 'TLSv1.2',
                rejectUnauthorized: true
            },
            multipleStatements: true
        });

        console.log('Connected to TiDB.');
        
        console.log('Creating database if not exists...');
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DATABASE}\`;`);
        await connection.query(`USE \`${process.env.DATABASE}\`;`);

        const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');

        console.log('Running SQL init script...');
        await connection.query(sql);
        console.log('SQL init script executed successfully.');

        await connection.end();
    } catch (error) {
        console.error('Error executing SQL init:', error);
        process.exit(1);
    }
};

runInit();
