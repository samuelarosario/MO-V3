const https = require('https');
const fs = require('fs');

/**
 * SerpAPI Flight Search Integration
 * Replaces AviationStack with Google Flights search via SerpAPI
 */
class SerpAPIFlightSearcher {
    constructor() {
        this.credentials = this.loadCredentials();
        this.apiKey = this.credentials.serpapi_key;
        this.baseUrl = 'https://serpapi.com/search.json';
    }

    loadCredentials() {
        try {
            const credentialsData = fs.readFileSync('./credentials.json', 'utf8');
            return JSON.parse(credentialsData);
        } catch (error) {
            console.error('❌ Error loading SerpAPI credentials:', error.message);
            throw new Error('SerpAPI credentials not found');
        }
    }

    /**
     * Search for flights using Google Flights via SerpAPI
     * Following official SerpAPI documentation for Google Flights
     */
    async searchFlights(origin, destination, departureDate = null) {
        console.log(`🔍 Searching flights via SerpAPI: ${origin} → ${destination}`);
        
        // Validate API key
        if (!this.apiKey) {
            throw new Error('SerpAPI key is required');
        }

        // Format date properly
        const formattedDate = departureDate || new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0];
        
        // Use correct parameter names according to SerpAPI documentation
        const params = new URLSearchParams({
            engine: 'google_flights',
            api_key: this.apiKey,
            departure_id: origin.toUpperCase(),
            arrival_id: destination.toUpperCase(),
            outbound_date: formattedDate,
            type: '2', // 1 = round trip, 2 = one way
            currency: 'USD',
            hl: 'en', // Language
            gl: 'us', // Country
            no_cache: 'false' // Use cache if available
        });

        return new Promise((resolve, reject) => {
            const url = `${this.baseUrl}?${params}`;
            console.log(`📞 SerpAPI Request: ${url.replace(this.apiKey, '[REDACTED]')}`);
            
            const request = https.get(url, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        
                        // Check for SerpAPI errors according to documentation
                        if (response.error) {
                            reject(new Error(`SerpAPI Error: ${response.error}`));
                            return;
                        }

                        // Check search metadata status
                        if (response.search_metadata && response.search_metadata.status === 'Error') {
                            reject(new Error(`Search Error: ${response.search_metadata.error || 'Unknown error'}`));
                            return;
                        }

                        if (res.statusCode === 200) {
                            const processedFlights = this.processGoogleFlightsData(response);
                            resolve(processedFlights);
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                        }
                    } catch (parseError) {
                        reject(new Error(`JSON Parse Error: ${parseError.message}`));
                    }
                });
            });

            request.on('error', (error) => {
                reject(new Error(`Request Error: ${error.message}`));
            });

            // Set timeout for requests (30 seconds)
            request.setTimeout(30000, () => {
                request.destroy();
                reject(new Error('Request timeout - SerpAPI took too long to respond'));
            });
        });
    }

    /**
     * Search for specific flight information using Google Search via SerpAPI
     * Following official SerpAPI documentation for Google Search
     */
    async searchSpecificFlight(flightNumber) {
        console.log(`🔍 Searching specific flight via SerpAPI: ${flightNumber}`);
        
        // Validate API key
        if (!this.apiKey) {
            throw new Error('SerpAPI key is required');
        }

        // Use proper search query for flight tracking 
        const searchQuery = `${flightNumber} flight status live tracking`;
        
        const params = new URLSearchParams({
            engine: 'google',
            api_key: this.apiKey,
            q: searchQuery,
            num: 10, // Number of results
            hl: 'en', // Language
            gl: 'us', // Country
            safe: 'off', // Safe search
            no_cache: 'false' // Use cache if available
        });

        return new Promise((resolve, reject) => {
            const url = `${this.baseUrl}?${params}`;
            console.log(`📞 SerpAPI Request: ${url.replace(this.apiKey, '[REDACTED]')}`);
            
            const request = https.get(url, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        
                        // Check for SerpAPI errors according to documentation
                        if (response.error) {
                            reject(new Error(`SerpAPI Error: ${response.error}`));
                            return;
                        }

                        // Check search metadata status
                        if (response.search_metadata && response.search_metadata.status === 'Error') {
                            reject(new Error(`Search Error: ${response.search_metadata.error || 'Unknown error'}`));
                            return;
                        }

                        if (res.statusCode === 200) {
                            const flightInfo = this.processFlightStatusData(response, flightNumber);
                            resolve(flightInfo);
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                        }
                    } catch (parseError) {
                        reject(new Error(`JSON Parse Error: ${parseError.message}`));
                    }
                });
            });

            request.on('error', (error) => {
                reject(new Error(`Request Error: ${error.message}`));
            });

            // Set timeout for requests (30 seconds)
            request.setTimeout(30000, () => {
                request.destroy();
                reject(new Error('Request timeout - SerpAPI took too long to respond'));
            });
        });
    }

    /**
     * Process Google Flights search results according to SerpAPI response structure
     */
    processGoogleFlightsData(response) {
        const flights = [];
        
        // Log the search metadata for debugging
        if (response.search_metadata) {
            console.log(`🔍 Search ID: ${response.search_metadata.id}`);
            console.log(`⏱️  Processing time: ${response.search_metadata.total_time_taken}s`);
            console.log(`📊 Status: ${response.search_metadata.status}`);
        }

        // Check for no results
        if (!response.best_flights && !response.other_flights) {
            console.log('❌ No flight data found in SerpAPI response');
            
            // Check if there's any search information that explains why
            if (response.search_information) {
                console.log(`📝 Search info: ${JSON.stringify(response.search_information)}`);
            }
            
            return flights;
        }

        // Process best flights according to SerpAPI structure
        if (response.best_flights && Array.isArray(response.best_flights)) {
            console.log(`✈️  Processing ${response.best_flights.length} best flights`);
            response.best_flights.forEach((flight, index) => {
                try {
                    flights.push(this.formatFlightData(flight, 'best'));
                } catch (error) {
                    console.error(`❌ Error processing best flight ${index}:`, error.message);
                }
            });
        }

        // Process other flights according to SerpAPI structure
        if (response.other_flights && Array.isArray(response.other_flights)) {
            console.log(`✈️  Processing ${response.other_flights.length} other flights`);
            response.other_flights.forEach((flight, index) => {
                try {
                    flights.push(this.formatFlightData(flight, 'other'));
                } catch (error) {
                    console.error(`❌ Error processing other flight ${index}:`, error.message);
                }
            });
        }

        console.log(`✅ Successfully processed ${flights.length} flights from SerpAPI`);
        return flights;
    }

    /**
     * Process flight status search results according to SerpAPI organic results structure
     */
    processFlightStatusData(response, flightNumber) {
        const flightInfo = {
            flight_number: flightNumber,
            status: 'unknown',
            departure_airport: null,
            arrival_airport: null,
            departure_code: null,
            arrival_code: null,
            departure_time: null,
            arrival_time: null,
            airline: null,
            source: 'serpapi_search',
            search_metadata: response.search_metadata || null,
            found_results: 0
        };

        // Process organic results according to SerpAPI structure
        if (response.organic_results && Array.isArray(response.organic_results)) {
            console.log(`🔍 Processing ${response.organic_results.length} search results`);
            
            response.organic_results.forEach((result, index) => {
                if (result.title && result.title.toLowerCase().includes(flightNumber.toLowerCase())) {
                    console.log(`✅ Found relevant result ${index + 1}: ${result.title}`);
                    
                    flightInfo.found_results++;
                    flightInfo.title = result.title;
                    flightInfo.link = result.link;
                    flightInfo.snippet = result.snippet;
                    flightInfo.displayed_link = result.displayed_link;
                    
                    // Try to extract flight info from snippet
                    if (result.snippet) {
                        this.extractFlightInfoFromText(result.snippet, flightInfo);
                    }
                    
                    // Try to extract from title as well
                    if (result.title) {
                        this.extractFlightInfoFromText(result.title, flightInfo);
                    }
                }
            });
        }

        // Check for knowledge graph results (more structured data)
        if (response.knowledge_graph) {
            console.log('🎯 Found knowledge graph data');
            flightInfo.knowledge_graph = response.knowledge_graph;
            
            if (response.knowledge_graph.title) {
                this.extractFlightInfoFromText(response.knowledge_graph.title, flightInfo);
            }
            
            if (response.knowledge_graph.description) {
                this.extractFlightInfoFromText(response.knowledge_graph.description, flightInfo);
            }
        }

        // Check for answer box (direct answers)
        if (response.answer_box) {
            console.log('📦 Found answer box data');
            flightInfo.answer_box = response.answer_box;
            
            if (response.answer_box.answer) {
                this.extractFlightInfoFromText(response.answer_box.answer, flightInfo);
            }
        }

        console.log(`📊 Flight info extraction complete. Found ${flightInfo.found_results} relevant results`);
        return flightInfo;
    }

    /**
     * Format flight data from Google Flights according to SerpAPI response structure
     */
    formatFlightData(flight, category) {
        try {
            // Handle the nested flights array structure from SerpAPI
            const flightSegment = flight.flights && flight.flights[0] ? flight.flights[0] : null;
            
            if (!flightSegment) {
                console.warn('⚠️  Flight segment not found, using default values');
            }

            return {
                flight_number: flightSegment?.flight_number || 'Unknown',
                airline_name: flightSegment?.airline || 'Unknown',
                airline_logo: flightSegment?.airline_logo || null,
                departure_airport: flightSegment?.departure_airport?.name || 'Unknown',
                departure_code: flightSegment?.departure_airport?.id || 'UNK',
                departure_time: flightSegment?.departure_airport?.time || null,
                departure_terminal: flightSegment?.departure_airport?.terminal || null,
                arrival_airport: flightSegment?.arrival_airport?.name || 'Unknown',
                arrival_code: flightSegment?.arrival_airport?.id || 'UNK',
                arrival_time: flightSegment?.arrival_airport?.time || null,
                arrival_terminal: flightSegment?.arrival_airport?.terminal || null,
                duration: flight.total_duration || null,
                price: flight.price || null,
                currency: flight.currency || 'USD',
                category: category,
                carbon_emissions: flight.carbon_emissions?.this_flight || null,
                layovers: flight.layovers || [],
                layover_duration: flight.layovers ? flight.layovers.map(l => l.duration).join(', ') : null,
                booking_token: flight.booking_token || null,
                source: 'serpapi_google_flights',
                updated_at: new Date().toISOString(),
                // Additional SerpAPI specific fields
                serpapi_flight_id: flight.flight_id || null,
                type: flight.type || null,
                airplane: flightSegment?.airplane || null,
                legroom: flightSegment?.legroom || null,
                often_delayed_by_over_30_min: flightSegment?.often_delayed_by_over_30_min || null
            };
        } catch (error) {
            console.error('❌ Error formatting flight data:', error.message);
            return {
                flight_number: 'Error',
                airline_name: 'Error',
                departure_airport: 'Error',
                departure_code: 'ERR',
                arrival_airport: 'Error',
                arrival_code: 'ERR',
                error: error.message,
                source: 'serpapi_google_flights',
                updated_at: new Date().toISOString()
            };
        }
    }

    /**
     * Extract flight information from text snippets
     */
    extractFlightInfoFromText(text, flightInfo) {
        // Extract departure and arrival airports
        const airportPattern = /([A-Z]{3})\s*(?:to|→|-)\s*([A-Z]{3})/i;
        const airportMatch = text.match(airportPattern);
        if (airportMatch) {
            flightInfo.departure_code = airportMatch[1].toUpperCase();
            flightInfo.arrival_code = airportMatch[2].toUpperCase();
        }

        // Extract airline name
        const airlinePattern = /(Philippine Airlines|Cebu Pacific|PAL|Emirates|Singapore Airlines|Cathay Pacific)/i;
        const airlineMatch = text.match(airlinePattern);
        if (airlineMatch) {
            flightInfo.airline = airlineMatch[1];
        }

        // Extract status
        const statusPattern = /(on time|delayed|cancelled|boarding|departed|arrived)/i;
        const statusMatch = text.match(statusPattern);
        if (statusMatch) {
            flightInfo.status = statusMatch[1].toLowerCase();
        }

        // Extract times
        const timePattern = /(\d{1,2}:\d{2}\s*(?:AM|PM)?)/gi;
        const timeMatches = text.match(timePattern);
        if (timeMatches && timeMatches.length >= 2) {
            flightInfo.departure_time = timeMatches[0];
            flightInfo.arrival_time = timeMatches[1];
        }
    }

    /**
     * Get airline information via search using SerpAPI
     * Following official documentation for Google Search engine
     */
    async searchAirlineInfo(airlineCode) {
        console.log(`🔍 Searching airline info: ${airlineCode}`);
        
        // Validate API key
        if (!this.apiKey) {
            throw new Error('SerpAPI key is required');
        }

        // More specific search query for airline information
        const searchQuery = `${airlineCode} airline information fleet routes headquarters`;
        
        const params = new URLSearchParams({
            engine: 'google',
            api_key: this.apiKey,
            q: searchQuery,
            num: 10, // Number of results
            hl: 'en', // Language
            gl: 'us', // Country
            safe: 'off', // Safe search
            no_cache: 'false' // Use cache if available
        });

        return new Promise((resolve, reject) => {
            const url = `${this.baseUrl}?${params}`;
            console.log(`📞 SerpAPI Request: ${url.replace(this.apiKey, '[REDACTED]')}`);
            
            const request = https.get(url, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        
                        // Check for SerpAPI errors according to documentation
                        if (response.error) {
                            reject(new Error(`SerpAPI Error: ${response.error}`));
                            return;
                        }

                        // Check search metadata status
                        if (response.search_metadata && response.search_metadata.status === 'Error') {
                            reject(new Error(`Search Error: ${response.search_metadata.error || 'Unknown error'}`));
                            return;
                        }

                        if (res.statusCode === 200) {
                            const airlineInfo = this.processAirlineData(response, airlineCode);
                            resolve(airlineInfo);
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                        }
                    } catch (parseError) {
                        reject(new Error(`JSON Parse Error: ${parseError.message}`));
                    }
                });
            });

            request.on('error', (error) => {
                reject(new Error(`Request Error: ${error.message}`));
            });

            // Set timeout for requests (30 seconds)
            request.setTimeout(30000, () => {
                request.destroy();
                reject(new Error('Request timeout - SerpAPI took too long to respond'));
            });
        });
    }

    /**
     * Process airline search results according to SerpAPI response structure
     */
    processAirlineData(response, airlineCode) {
        const airlineInfo = {
            airline_code: airlineCode,
            airline_name: null,
            hub_airports: [],
            fleet_info: null,
            routes_info: null,
            headquarters: null,
            website: null,
            source: 'serpapi_search',
            search_metadata: response.search_metadata || null,
            found_results: 0
        };

        // Process organic results according to SerpAPI structure
        if (response.organic_results && Array.isArray(response.organic_results)) {
            console.log(`🔍 Processing ${response.organic_results.length} airline search results`);
            
            response.organic_results.forEach((result, index) => {
                if (result.title && result.snippet) {
                    const titleLower = result.title.toLowerCase();
                    const snippetLower = result.snippet.toLowerCase();
                    
                    // Check if this result is relevant to the airline
                    if (titleLower.includes(airlineCode.toLowerCase()) || 
                        titleLower.includes('airline') ||
                        snippetLower.includes(airlineCode.toLowerCase())) {
                        
                        console.log(`✅ Found relevant airline result ${index + 1}: ${result.title}`);
                        airlineInfo.found_results++;
                        
                        // Extract airline name from title (usually the first part)
                        if (!airlineInfo.airline_name && titleLower.includes(airlineCode.toLowerCase())) {
                            const titleParts = result.title.split('-')[0].split('|')[0].trim();
                            airlineInfo.airline_name = titleParts;
                        }
                        
                        // Look for fleet information
                        if (snippetLower.includes('fleet') || 
                            snippetLower.includes('aircraft') ||
                            snippetLower.includes('planes')) {
                            airlineInfo.fleet_info = result.snippet;
                        }
                        
                        // Look for route information
                        if (snippetLower.includes('routes') || 
                            snippetLower.includes('destinations') ||
                            snippetLower.includes('flies to')) {
                            airlineInfo.routes_info = result.snippet;
                        }
                        
                        // Look for headquarters information
                        if (snippetLower.includes('headquarters') || 
                            snippetLower.includes('based in') ||
                            snippetLower.includes('founded')) {
                            airlineInfo.headquarters = result.snippet;
                        }
                        
                        // Extract website if available
                        if (result.displayed_link && !airlineInfo.website) {
                            airlineInfo.website = result.displayed_link;
                        }
                    }
                }
            });
        }

        // Check for knowledge graph results (more structured data)
        if (response.knowledge_graph) {
            console.log('🎯 Found knowledge graph data for airline');
            airlineInfo.knowledge_graph = response.knowledge_graph;
            
            if (response.knowledge_graph.title && !airlineInfo.airline_name) {
                airlineInfo.airline_name = response.knowledge_graph.title;
            }
            
            if (response.knowledge_graph.description) {
                airlineInfo.description = response.knowledge_graph.description;
            }
            
            // Extract structured data from knowledge graph
            if (response.knowledge_graph.headquarters) {
                airlineInfo.headquarters = response.knowledge_graph.headquarters;
            }
            
            if (response.knowledge_graph.founded) {
                airlineInfo.founded = response.knowledge_graph.founded;
            }
        }

        console.log(`📊 Airline info extraction complete. Found ${airlineInfo.found_results} relevant results`);
        return airlineInfo;
    }

    /**
     * Add rate limiting to prevent API abuse
     */
    async rateLimitedRequest(requestFunction, ...args) {
        // Simple rate limiting - wait 1 second between requests
        if (this.lastRequestTime) {
            const timeSinceLastRequest = Date.now() - this.lastRequestTime;
            if (timeSinceLastRequest < 1000) {
                await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastRequest));
            }
        }
        
        this.lastRequestTime = Date.now();
        return requestFunction.apply(this, args);
    }

    /**
     * Validate API response according to SerpAPI documentation
     */
    validateResponse(response) {
        // Check for common SerpAPI error patterns
        if (response.error) {
            throw new Error(`API Error: ${response.error}`);
        }
        
        if (response.search_metadata?.status === 'Error') {
            throw new Error(`Search Error: ${response.search_metadata.error || 'Unknown search error'}`);
        }
        
        if (response.search_metadata?.status === 'Processing') {
            throw new Error('Search still processing - try again later');
        }
        
        return true;
    }
}

module.exports = SerpAPIFlightSearcher;
