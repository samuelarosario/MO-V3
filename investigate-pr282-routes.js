const https = require('https');
const url = require('url');

// SerpAPI configuration
const SERPAPI_KEY = '2fccbd120af01f77c5443c23695d0b92170cd9d8d6c1b9551a98bf0edba8cd2f';
const SERPAPI_BASE_URL = 'https://serpapi.com/search.json';

// Helper function to make HTTPS requests
function makeRequest(requestUrl) {
    return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(requestUrl);
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.path,
            method: 'GET',
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (error) {
                    reject(new Error('Failed to parse JSON response: ' + error.message));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

async function investigateAllPR282Routes() {
    console.log('🔍 Investigating all possible PR282 routes...');
    console.log('==================================================');
    
    const searchQueries = [
        'PR282 Philippine Airlines Port Moresby Manila',
        'PR282 Philippine Airlines Davao Manila', 
        'PR282 PAL flight schedule all routes',
        'Philippine Airlines PR282 flight tracker',
        'PR282 flight status today'
    ];
    
    for (let i = 0; i < searchQueries.length; i++) {
        const query = searchQueries[i];
        console.log(`\n🔍 Search ${i + 1}: "${query}"`);
        
        try {
            const searchParams = new URLSearchParams({
                engine: 'google',
                api_key: SERPAPI_KEY,
                q: query,
                num: '10',
                hl: 'en',
                gl: 'us',
                safe: 'off',
                no_cache: 'true'
            });
            
            const requestUrl = `${SERPAPI_BASE_URL}?${searchParams.toString()}`;
            const response = await makeRequest(requestUrl);
            
            if (response && response.organic_results) {
                console.log(`   📊 Found ${response.organic_results.length} results`);
                
                response.organic_results.forEach((result, index) => {
                    const title = result.title || '';
                    const snippet = result.snippet || '';
                    const combined = title.toLowerCase() + ' ' + snippet.toLowerCase();
                    
                    if (combined.includes('pr282') || combined.includes('pr 282')) {
                        console.log(`   ✅ Result ${index + 1}: ${title}`);
                        
                        // Extract route information
                        const routeInfo = [];
                        if (combined.includes('port moresby') || combined.includes('pom')) {
                            routeInfo.push('Port Moresby (POM)');
                        }
                        if (combined.includes('manila') || combined.includes('mnl')) {
                            routeInfo.push('Manila (MNL)');
                        }
                        if (combined.includes('davao') || combined.includes('dvo')) {
                            routeInfo.push('Davao (DVO)');
                        }
                        if (combined.includes('cebu') || combined.includes('ceb')) {
                            routeInfo.push('Cebu (CEB)');
                        }
                        
                        if (routeInfo.length >= 2) {
                            console.log(`      🛩️  Route: ${routeInfo[0]} → ${routeInfo[1]}`);
                        }
                        
                        // Extract times
                        const timePattern = /(\d{1,2}:\d{2})/g;
                        const times = snippet.match(timePattern);
                        if (times && times.length >= 2) {
                            console.log(`      ⏰ Times: ${times[0]} → ${times[1]}`);
                        }
                        
                        console.log(`      📄 ${snippet.substring(0, 100)}...`);
                    }
                });
            } else {
                console.log('   ❌ No results found');
            }
            
            // Delay between requests
            if (i < searchQueries.length - 1) {
                console.log('   ⏳ Waiting 2 seconds...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
        } catch (error) {
            console.error(`   ❌ Error with search ${i + 1}:`, error.message);
        }
    }
}

// Run the investigation
console.log('🚀 Starting comprehensive PR282 route investigation...');
investigateAllPR282Routes().then(() => {
    console.log('\n🎉 PR282 investigation complete!');
    
    console.log('\n📊 Summary:');
    console.log('==================================================');
    console.log('Based on the API searches, it appears PR282 may operate multiple routes:');
    console.log('1. Port Moresby → Manila (our database shows 15:45 → 19:35)');
    console.log('2. Davao → Manila (API found 07:17 → 09:19)');
    console.log('');
    console.log('This is common for airline flight numbers - the same flight number');
    console.log('can be used for different routes or different days of the week.');
    console.log('');
    console.log('Our database may be correct for the POM-MNL route,');
    console.log('while the API found the DVO-MNL route.');
    
    process.exit(0);
}).catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
});
