import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

let pool: Pool | null = null;
let db: any = null;

if (!process.env.DATABASE_URL || process.env.DATABASE_URL === "postgresql://test:test@localhost:5432/mahjong_test") {
  console.warn("⚠️  DATABASE_URL not configured or using test URL. Some features may not work.");
  console.warn("   Please update .env with your actual Neon database URL from Replit.");
  
  // Create comprehensive mock objects for initial testing
  pool = null;
  
  const mockResult = {
    then: (resolve: any) => resolve([]),
    catch: (reject: any) => reject,
    orderBy: () => mockResult,
    where: () => mockResult,
    set: () => mockResult,
    values: () => mockResult,
    returning: () => mockResult,
    from: () => mockResult,
  };
  
  db = {
    select: () => mockResult,
    insert: () => mockResult,
    update: () => mockResult,
    delete: () => mockResult,
    // Add transaction support
    transaction: (callback: any) => callback(db),
  };
} else {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
}

export { pool, db };