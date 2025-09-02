#!/usr/bin/env node
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load production environment variables
config({ path: '.env.production' });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.production');
  process.exit(1);
}

console.log('🚀 Setting up production database schema...');
console.log('📍 Database:', process.env.DATABASE_URL.split('@')[1].split('/')[0]);

try {
  // Connect to Neon database
  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);
  
  console.log('✅ Connected to Neon database successfully');
  
  // Test the connection
  const result = await sql`SELECT version()`;
  console.log('📋 PostgreSQL version:', result[0].version);
  
  console.log('🔧 Run the following command to push schema to production:');
  console.log('   DATABASE_URL="' + process.env.DATABASE_URL + '" npm run db:push');
  
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  process.exit(1);
}