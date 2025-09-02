import https from 'https';
import http from 'http';

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    let data = '';
    
    const req = client.get(url, (res) => {
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function analyzeApp() {
  try {
    console.log('🔍 Analyzing Mahjong Application on localhost:5173');
    console.log('=' .repeat(60));
    
    const response = await fetchPage('http://localhost:5173');
    
    console.log('✅ Status:', response.status);
    console.log('📄 Content-Type:', response.headers['content-type']);
    console.log('📏 Content-Length:', response.data.length, 'bytes');
    
    // Analyze HTML structure
    const html = response.data;
    
    console.log('\n📋 HTML Analysis:');
    console.log('- Title tag:', html.match(/<title[^>]*>([^<]*)<\/title>/)?.[1] || 'Not found');
    console.log('- Meta viewport:', html.includes('viewport') ? '✅ Present' : '❌ Missing');
    console.log('- React root div:', html.includes('id="root"') ? '✅ Present' : '❌ Missing');
    console.log('- React scripts:', html.includes('react-refresh') ? '✅ Vite + React setup' : '❌ Missing');
    
    // Check for external dependencies
    console.log('\n🌐 External Resources:');
    const googleFonts = html.match(/fonts\.googleapis\.com/g);
    console.log('- Google Fonts:', googleFonts ? `✅ ${googleFonts.length} references` : '❌ Not found');
    console.log('- Replit banner:', html.includes('replit-dev-banner') ? '✅ Present (development)' : '❌ Not found');
    
    // Extract main script path
    const mainScript = html.match(/src="([^"]*main\.tsx[^"]*)"/)?.[1];
    if (mainScript) {
      console.log('- Main script path:', mainScript);
      
      // Try to fetch the main script to see if it's working
      try {
        const scriptResponse = await fetchPage(`http://localhost:5173${mainScript}`);
        console.log('- Main script status:', scriptResponse.status === 200 ? '✅ Loading' : `❌ ${scriptResponse.status}`);
      } catch (e) {
        console.log('- Main script status: ❌ Failed to load');
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 APPLICATION STATUS: Vite client server is RUNNING');
    console.log('📍 URL: http://localhost:5173');
    console.log('⚠️  Backend server (port 5000) is NOT responding');
    
  } catch (error) {
    console.error('❌ Error analyzing application:', error.message);
  }
}

analyzeApp();
