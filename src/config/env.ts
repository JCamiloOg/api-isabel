import 'dotenv/config';

const PORT = process.env.PORT || "3000";
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGINS = JSON.parse(process.env.CORS_ORIGINS || '[]');
const DATABASE_URL = process.env.DATABASE_URL;
const DIRECT_URL = process.env.DIRECT_URL;


if (!DATABASE_URL || !DIRECT_URL) {
    console.log("No database string.");
    process.exit(-1);
}

export { PORT, NODE_ENV, CORS_ORIGINS, DATABASE_URL, DIRECT_URL };