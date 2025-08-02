// Security-MO Flight Search App JavaScript

class FlightSearchApp {
    constructor() {
        this.apiBase = 'http://localhost:3000/api';
        this.airports = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadAirports();
        this.setDefaultDate();
        this.loadDatabaseStats();
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Flight search form
        document.getElementById('search-flights').addEventListener('click', () => this.searchFlights());
        document.getElementById('clear-form').addEventListener('click', () => this.clearForm());
        document.getElementById('swap-airports').addEventListener('click', () => this.swapAirports());

        // Airport input suggestions
        document.getElementById('origin').addEventListener('input', (e) => this.handleAirportInput(e, 'origin'));
        document.getElementById('destination').addEventListener('input', (e) => this.handleAirportInput(e, 'destination'));

        // Tab key support for origin field - select first suggestion
        document.getElementById('origin').addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const suggestionsEl = document.getElementById('origin-suggestions');
                if (suggestionsEl.style.display === 'block') {
                    const firstSuggestion = suggestionsEl.querySelector('.suggestion-item');
                    if (firstSuggestion) {
                        e.preventDefault(); // Prevent default tab behavior
                        firstSuggestion.click(); // Trigger the click event to select the suggestion
                    }
                }
            }
        });

        // Clear data attributes when user manually types
        document.getElementById('origin').addEventListener('input', (e) => {
            if (e.inputType !== 'insertReplacementText') {
                e.target.removeAttribute('data-airport-code');
            }
        });
        document.getElementById('destination').addEventListener('input', (e) => {
            if (e.inputType !== 'insertReplacementText') {
                e.target.removeAttribute('data-airport-code');
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.input-wrapper')) {
                this.hideSuggestions();
            }
        });

        // Database explorer controls
        document.getElementById('load-airports').addEventListener('click', () => this.loadAirportsTable());
        document.getElementById('load-flights').addEventListener('click', () => this.loadFlightsTable());

        // Enter key support
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.closest('.search-form')) {
                this.searchFlights();
            }
        });
    }

    switchTab(tabName) {
        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        // Load data for explorer tab
        if (tabName === 'explorer') {
            this.loadDatabaseStats();
            this.loadCountries();
            this.loadAirlinesGrid();
        }
    }

    setDefaultDate() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('departure-date').value = tomorrow.toISOString().split('T')[0];
    }

    async loadAirports() {
        try {
            const response = await fetch(`${this.apiBase}/airports?limit=100`);
            const data = await response.json();
            this.airports = data.airports;
        } catch (error) {
            console.error('Error loading airports:', error);
        }
    }

    handleAirportInput(event, inputType) {
        const value = event.target.value;
        const suggestionsId = `${inputType}-suggestions`;
        
        if (value.length < 2) {
            this.hideSuggestions(suggestionsId);
            return;
        }

        const filtered = this.airports.filter(airport => 
            airport.code.toLowerCase().includes(value.toLowerCase()) ||
            airport.name.toLowerCase().includes(value.toLowerCase()) ||
            airport.city.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 5);

        this.showSuggestions(filtered, suggestionsId, inputType);
    }

    showSuggestions(airports, suggestionsId, inputType) {
        const suggestionsEl = document.getElementById(suggestionsId);
        
        if (airports.length === 0) {
            this.hideSuggestions(suggestionsId);
            return;
        }

        const html = airports.map(airport => `
            <div class="suggestion-item" data-code="${airport.code}" data-input="${inputType}">
                <div class="suggestion-code">${airport.code}</div>
                <div class="suggestion-info">
                    <div class="suggestion-name">${airport.name}</div>
                    <div class="suggestion-location">${airport.city}, ${airport.country}</div>
                </div>
            </div>
        `).join('');

        suggestionsEl.innerHTML = html;
        suggestionsEl.style.display = 'block';

        // Add click listeners to suggestions
        suggestionsEl.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const code = item.dataset.code;
                const inputId = item.dataset.input;
                const airport = airports.find(a => a.code === code);
                
                // Display more informative text: "CODE - Airport Name, City"
                const displayText = `${airport.code} - ${airport.name}, ${airport.city}`;
                document.getElementById(inputId).value = displayText;
                
                // Store the airport code in a data attribute for search purposes
                document.getElementById(inputId).setAttribute('data-airport-code', airport.code);
                
                this.hideSuggestions();
            });
        });
    }

    hideSuggestions(suggestionsId = null) {
        if (suggestionsId) {
            document.getElementById(suggestionsId).style.display = 'none';
        } else {
            document.querySelectorAll('.suggestions').forEach(el => {
                el.style.display = 'none';
            });
        }
    }

    swapAirports() {
        const originInput = document.getElementById('origin');
        const destinationInput = document.getElementById('destination');
        
        const originValue = originInput.value;
        const destinationValue = destinationInput.value;
        const originCode = originInput.getAttribute('data-airport-code');
        const destinationCode = destinationInput.getAttribute('data-airport-code');
        
        // Swap the display values
        originInput.value = destinationValue;
        destinationInput.value = originValue;
        
        // Swap the airport codes
        if (originCode) originInput.setAttribute('data-airport-code', destinationCode || '');
        if (destinationCode) destinationInput.setAttribute('data-airport-code', originCode || '');
    }

    clearForm() {
        // Clear input fields
        document.getElementById('origin').value = '';
        document.getElementById('destination').value = '';
        document.getElementById('departure-date').value = '';
        document.getElementById('return-date').value = '';
        
        // Clear airport codes
        document.getElementById('origin').removeAttribute('data-airport-code');
        document.getElementById('destination').removeAttribute('data-airport-code');
        
        // Hide results and suggestions
        document.getElementById('results-container').style.display = 'none';
        document.getElementById('no-results').style.display = 'none';
        this.hideSuggestions();
        
        // Focus on first input
        document.getElementById('origin').focus();
    }

    async searchFlights() {
        const originInput = document.getElementById('origin');
        const destinationInput = document.getElementById('destination');
        
        // Get airport codes from data attributes or extract from input value
        let origin = originInput.getAttribute('data-airport-code');
        let destination = destinationInput.getAttribute('data-airport-code');
        
        // If no data attribute, try to extract code from input value
        if (!origin) {
            const originValue = originInput.value.trim();
            if (originValue.includes(' - ')) {
                origin = originValue.split(' - ')[0].toUpperCase();
            } else {
                origin = originValue.toUpperCase();
            }
        }
        
        if (!destination) {
            const destinationValue = destinationInput.value.trim();
            if (destinationValue.includes(' - ')) {
                destination = destinationValue.split(' - ')[0].toUpperCase();
            } else {
                destination = destinationValue.toUpperCase();
            }
        }
        
        const date = document.getElementById('departure-date').value;

        if (!origin || !destination) {
            alert('Please enter both origin and destination airports');
            return;
        }

        if (origin === destination) {
            alert('Origin and destination cannot be the same');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiBase}/search?from=${origin}&to=${destination}&date=${date}`);
            const data = await response.json();

            this.showLoading(false);
            this.displaySearchResults(data);
        } catch (error) {
            this.showLoading(false);
            console.error('Search error:', error);
            alert('Error searching flights. Please try again.');
        }
    }

    displaySearchResults(data) {
        const resultsContainer = document.getElementById('results-container');
        const noResultsEl = document.getElementById('no-results');
        const resultsTitle = document.getElementById('results-title');
        const resultsInfo = document.getElementById('results-info');
        const flightsList = document.getElementById('flights-list');

        if (data.flights && data.flights.length > 0) {
            // Show results
            resultsContainer.style.display = 'block';
            noResultsEl.style.display = 'none';

            // Update header
            resultsTitle.textContent = `${data.route.from} → ${data.route.to}`;
            resultsInfo.textContent = `${data.count} flight${data.count !== 1 ? 's' : ''} found`;

            // Generate flight cards
            const html = data.flights.map(flight => this.createFlightCard(flight)).join('');
            flightsList.innerHTML = html;

            // Scroll to results
            resultsContainer.scrollIntoView({ behavior: 'smooth' });
        } else {
            // Show no results
            resultsContainer.style.display = 'none';
            noResultsEl.style.display = 'block';
            noResultsEl.scrollIntoView({ behavior: 'smooth' });
        }
    }

    createFlightCard(flight) {
        const formatTime = (time) => {
            return time.substring(0, 5); // Remove seconds
        };

        const formatDuration = (minutes) => {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hours}h ${mins}m`;
        };

        // Get time zone abbreviations and UTC offsets based on airport locations
        const getTimeZone = (airportCode) => {
            const timeZones = {
                'MNL': 'PHT', // Philippine Time (UTC+8)
                'NRT': 'JST', // Japan Standard Time (UTC+9) 
                'HND': 'JST', // Japan Standard Time (UTC+9)
                'SIN': 'SGT', // Singapore Time (UTC+8)
                'HKG': 'HKT', // Hong Kong Time (UTC+8)
                'SYD': 'AEDT', // Australian Eastern Daylight Time (UTC+11)
                'MEL': 'AEDT', // Australian Eastern Daylight Time (UTC+11)
                'POM': 'PGT', // Papua New Guinea Time (UTC+10)
                'LAE': 'PGT', // Papua New Guinea Time (UTC+10)
                'BNE': 'AEST', // Australian Eastern Standard Time (UTC+10)
                'CAN': 'CST', // China Standard Time (UTC+8)
                'SHA': 'CST', // China Standard Time (UTC+8)
                // Add more as needed
            };
            return timeZones[airportCode] || 'LCL';
        };

        const formatTimeWithZone = (time, airportCode) => {
            const formattedTime = formatTime(time);
            return formattedTime;
        };

        return `
            <div class="flight-card">
                <div class="flight-header">
                    <div class="flight-info-section">
                        <div class="flight-main-row">
                            <div class="airline-logo-container">
                                <img src="/images/airlines/${flight.flight_number.substring(0, 2)}.png" 
                                     alt="${flight.airline_name}" 
                                     class="airline-logo"
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                <div class="airline-logo-fallback" style="display:none;">
                                    <span class="material-icons">flight</span>
                                    <span class="airline-code">${flight.flight_number.substring(0, 2)}</span>
                                </div>
                            </div>
                            <div class="flight-number">${flight.flight_number}</div>
                        </div>
                        <div class="flight-sub-row">
                            <div class="airline-name">${flight.airline_name}</div>
                        </div>
                        <div class="flight-aircraft-row">
                            <div class="aircraft-type">${flight.aircraft_type || 'Aircraft type not specified'}</div>
                        </div>
                    </div>
                </div>
                
                <div class="flight-route">
                    <div class="airport-info">
                        <div class="airport-time">
                            <span class="material-icons time-icon">flight_takeoff</span>
                            ${formatTimeWithZone(flight.departure_time, flight.origin_code)}
                        </div>
                        <div class="airport-code">${flight.origin_code}</div>
                        <div class="airport-name">${flight.origin_name}</div>
                        <div class="airport-location">${flight.origin_city}, ${flight.origin_country}</div>
                    </div>
                    
                    <div class="flight-path">
                        <div class="duration">${formatDuration(flight.duration_minutes)}</div>
                        <div class="path-line">
                            <span class="material-icons flight-icon">flight</span>
                        </div>
                    </div>
                    
                    <div class="airport-info">
                        <div class="airport-time">
                            <span class="material-icons time-icon">flight_land</span>
                            ${formatTimeWithZone(flight.arrival_time, flight.destination_code)}
                        </div>
                        <div class="airport-code">${flight.destination_code}</div>
                        <div class="airport-name">${flight.dest_name}</div>
                        <div class="airport-location">${flight.dest_city}, ${flight.dest_country}</div>
                    </div>
                </div>
            </div>
        `;
    }

    showLoading(show) {
        document.getElementById('loading-spinner').style.display = show ? 'flex' : 'none';
    }

    // Database Explorer Methods
    async loadDatabaseStats() {
        try {
            const response = await fetch(`${this.apiBase}/stats`);
            const data = await response.json();

            document.getElementById('airports-count').textContent = data.stats.airports;
            document.getElementById('flights-count').textContent = data.stats.flights;
            document.getElementById('airlines-count').textContent = data.stats.airlines.length;
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadCountries() {
        try {
            const response = await fetch(`${this.apiBase}/airports`);
            const data = await response.json();
            
            const countries = [...new Set(data.airports.map(a => a.country))].sort();
            const select = document.getElementById('airport-country');
            
            select.innerHTML = '<option value="">All Countries</option>' + 
                countries.map(country => `<option value="${country}">${country}</option>`).join('');
        } catch (error) {
            console.error('Error loading countries:', error);
        }
    }

    async loadAirportsTable() {
        const search = document.getElementById('airport-search').value;
        const country = document.getElementById('airport-country').value;
        
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (country) params.append('country', country);
        params.append('limit', '50');

        try {
            const response = await fetch(`${this.apiBase}/airports?${params}`);
            const data = await response.json();
            
            this.displayAirportsTable(data.airports);
        } catch (error) {
            console.error('Error loading airports table:', error);
        }
    }

    displayAirportsTable(airports) {
        const tableEl = document.getElementById('airports-table');
        
        if (airports.length === 0) {
            tableEl.innerHTML = '<p>No airports found.</p>';
            return;
        }

        const html = `
            <table>
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Airport Name</th>
                        <th>City</th>
                        <th>Country</th>
                        <th>Coordinates</th>
                        <th>Timezone</th>
                    </tr>
                </thead>
                <tbody>
                    ${airports.map(airport => `
                        <tr>
                            <td class="code">${airport.code}</td>
                            <td>${airport.name}</td>
                            <td>${airport.city}</td>
                            <td>${airport.country}</td>
                            <td>${airport.latitude ? `${airport.latitude.toFixed(4)}, ${airport.longitude.toFixed(4)}` : 'N/A'}</td>
                            <td>${airport.timezone || 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        tableEl.innerHTML = html;
    }

    async loadFlightsTable() {
        const origin = document.getElementById('flight-origin').value.trim().toUpperCase();
        const destination = document.getElementById('flight-destination').value.trim().toUpperCase();
        const airline = document.getElementById('flight-airline').value.trim();
        
        const params = new URLSearchParams();
        if (origin) params.append('origin', origin);
        if (destination) params.append('destination', destination);
        if (airline) params.append('airline', airline);
        params.append('limit', '50');

        try {
            const response = await fetch(`${this.apiBase}/flights?${params}`);
            const data = await response.json();
            
            this.displayFlightsTable(data.flights);
        } catch (error) {
            console.error('Error loading flights table:', error);
        }
    }

    displayFlightsTable(flights) {
        const tableEl = document.getElementById('flights-table');
        
        if (flights.length === 0) {
            tableEl.innerHTML = '<p>No flights found. Try adjusting your search criteria.</p>';
            return;
        }

        const html = `
            <table>
                <thead>
                    <tr>
                        <th>Flight</th>
                        <th>Airline</th>
                        <th>Route</th>
                        <th>Departure</th>
                        <th>Arrival</th>
                        <th>Duration</th>
                        <th>Aircraft</th>
                    </tr>
                </thead>
                <tbody>
                    ${flights.map(flight => `
                        <tr>
                            <td class="code">${flight.flight_number}</td>
                            <td>${flight.airline_name}</td>
                            <td>
                                <strong>${flight.origin_code}</strong> → <strong>${flight.destination_code}</strong><br>
                                <small>${flight.origin_city} → ${flight.dest_city}</small>
                            </td>
                            <td>${flight.departure_time.substring(0, 5)}</td>
                            <td>${flight.arrival_time.substring(0, 5)}</td>
                            <td>${Math.floor(flight.duration_minutes / 60)}h ${flight.duration_minutes % 60}m</td>
                            <td>${flight.aircraft_type || 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        tableEl.innerHTML = html;
    }

    async loadAirlinesGrid() {
        try {
            const response = await fetch(`${this.apiBase}/stats`);
            const data = await response.json();
            
            const html = data.stats.airlines.map(airline => `
                <div class="airline-card">
                    <div class="airline-name">${airline.airline_name}</div>
                    <div class="airline-routes">${airline.routes} route${airline.routes !== 1 ? 's' : ''}</div>
                </div>
            `).join('');
            
            document.getElementById('airlines-grid').innerHTML = html;
        } catch (error) {
            console.error('Error loading airlines:', error);
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FlightSearchApp();
});
