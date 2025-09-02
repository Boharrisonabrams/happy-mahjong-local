#!/usr/bin/env node

/**
 * Local Development Utilities
 * Helper scripts for setting up and managing local development environment
 */

import { randomBytes } from 'crypto';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

function generateSessionSecret() {
  return randomBytes(32).toString('hex');
}

function setupUploadsDirectory() {
  const uploadsDir = join(process.cwd(), 'uploads');
  const publicDir = join(uploadsDir, 'public');
  const privateDir = join(uploadsDir, 'private');
  
  [uploadsDir, publicDir, privateDir].forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`✓ Created directory: ${dir}`);
    }
  });
}

function createEnvIfNotExists() {
  const envPath = join(process.cwd(), '.env');
  const localEnvPath = join(process.cwd(), '.env.local');
  
  if (!existsSync(envPath) && existsSync(localEnvPath)) {
    // Copy .env.local to .env and generate session secret
    const fs = await import('fs/promises');
    let envContent = await fs.readFile(localEnvPath, 'utf8');
    
    // Replace placeholder session secret
    envContent = envContent.replace(
      'SESSION_SECRET=your-super-secure-session-secret-at-least-32-characters-long',
      `SESSION_SECRET=${generateSessionSecret()}`
    );
    
    await fs.writeFile(envPath, envContent);
    console.log('✓ Created .env file with generated session secret');
    console.log('⚠️  Remember to update DATABASE_URL with your actual database URL');
  }
}

function checkPrerequisites() {
  const issues = [];
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 18) {
    issues.push(`Node.js ${nodeVersion} detected. Please upgrade to Node.js 18 or higher.`);
  }
  
  // Check if npm is available
  try {
    const { execSync } = await import('child_process');
    execSync('npm --version', { stdio: 'ignore' });
  } catch {
    issues.push('npm not found. Please install Node.js with npm.');
  }
  
  return issues;
}

async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'setup':
      console.log('🚀 Setting up local development environment...\n');
      
      const issues = await checkPrerequisites();
      if (issues.length > 0) {
        console.log('❌ Prerequisites not met:');
        issues.forEach(issue => console.log(`   - ${issue}`));
        process.exit(1);
      }
      
      setupUploadsDirectory();
      await createEnvIfNotExists();
      
      console.log('\n✅ Local development environment setup complete!');
      console.log('\nNext steps:');
      console.log('1. Update .env file with your DATABASE_URL');
      console.log('2. Run: npm install');
      console.log('3. Run: npm run db:push');
      console.log('4. Run: npm run dev');
      break;
      
    case 'generate-secret':
      console.log(generateSessionSecret());
      break;
      
    case 'check':
      const checkIssues = await checkPrerequisites();
      if (checkIssues.length === 0) {
        console.log('✅ All prerequisites met');
      } else {
        console.log('❌ Issues found:');
        checkIssues.forEach(issue => console.log(`   - ${issue}`));
      }
      break;
      
    default:
      console.log('Local Development Utilities');
      console.log('');
      console.log('Commands:');
      console.log('  setup           - Setup local development environment');
      console.log('  generate-secret - Generate a session secret');
      console.log('  check          - Check prerequisites');
      console.log('');
      console.log('Usage: node local-dev-utils.js <command>');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}