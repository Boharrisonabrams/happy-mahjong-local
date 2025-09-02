// Vercel serverless function to handle all routes
const path = require('path');

// This will handle all routes and serve our built application
export default async function handler(req, res) {
  try {
    // Import the built server
    const serverPath = path.join(process.cwd(), 'dist', 'index.js');
    const server = await import(serverPath);
    
    // If the server exports a handler, use it
    if (server.default && typeof server.default === 'function') {
      return server.default(req, res);
    }
    
    // Otherwise, try to serve the app
    if (server.app) {
      return server.app(req, res);
    }
    
    // Fallback
    res.status(200).json({ message: 'Happy Mahjong Server is running!' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}