document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('weather-form');
    const cityInput = document.getElementById('city');
    const result = document.getElementById('result');

    // Free APIs used:
    // - Geocoding: https://geocoding-api.open-meteo.com
    // - Weather:   https://api.open-meteo.com
    // No API key required.

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const city = cityInput.value.trim();
        if (!city) {
            result.innerHTML = '<p class="hint">Please enter a city name.</p>';
            return;
        }

        // Clear previous result and show loading
        result.innerHTML = '<p class="hint">Looking up location and weather…</p>';

        try {
            const weatherHtml = await fetchCityWeather(city);
            result.innerHTML = weatherHtml;
        } catch (err) {
            result.innerHTML = `<p class="hint error">${escapeHtml(err.message)}</p>`;
        }
    });

    async function fetchCityWeather(city) {
        // 1) Geocoding: look up coordinates for the city (returns array of matches)
        const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5&language=en&format=json`;
        const geoResp = await fetch(geocodeUrl);
        if (!geoResp.ok) throw new Error('Failed to fetch location data.');
        const geoJson = await geoResp.json();

        if (!geoJson.results || geoJson.results.length === 0) {
            // No matching places — avoids "false" cities/places
            throw new Error('City not found. Please check the spelling or try a nearby city.');
        }

        // Choose the best match (first result). You could present options if you want.
        const place = geoJson.results[0];
        const { latitude, longitude, name, country, admin1 } = place;

        // 2) Weather: get current weather using Open-Meteo (no API key)
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=celsius&timezone=auto`;
        const weatherResp = await fetch(weatherUrl);
        if (!weatherResp.ok) throw new Error('Failed to fetch weather data.');
        const weatherJson = await weatherResp.json();
        const cw = weatherJson.current_weather;
        if (!cw) throw new Error('No current weather available for this location.');

        // Map Open-Meteo weathercode to a simple description
        const desc = weatherCodeToText(cw.weathercode);

        const placeLabel = [name, admin1, country].filter(Boolean).join(', ');
        return `
            <div class="city">${escapeHtml(placeLabel)}</div>
            <div class="temp">${escapeHtml(String(Math.round(cw.temperature)))}°C</div>
            <div class="desc">${escapeHtml(desc)}</div>
            <div class="meta">Wind: ${escapeHtml(String(cw.windspeed))} km/h • Last update: ${escapeHtml(new Date(cw.time).toLocaleString())}</div>
        `;
    }

    // Minimal mapping for weather codes from Open-Meteo / WMO codes
    function weatherCodeToText(code) {
        const map = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Fog',
            48: 'Depositing rime fog',
            51: 'Light drizzle',
            53: 'Moderate drizzle',
            55: 'Dense drizzle',
            56: 'Light freezing drizzle',
            57: 'Dense freezing drizzle',
            61: 'Slight rain',
            63: 'Moderate rain',
            65: 'Heavy rain',
            66: 'Light freezing rain',
            67: 'Heavy freezing rain',
            71: 'Slight snow fall',
            73: 'Moderate snow fall',
            75: 'Heavy snow fall',
            77: 'Snow grains',
            80: 'Slight rain showers',
            81: 'Moderate rain showers',
            82: 'Violent rain showers',
            85: 'Slight snow showers',
            86: 'Heavy snow showers',
            95: 'Thunderstorm',
            96: 'Thunderstorm with slight hail',
            99: 'Thunderstorm with heavy hail'
        };
        return map[code] || 'Unknown';
    }

    // small helper to avoid simple XSS from injected values
    function escapeHtml(str) {
        return String(str).replace(/[&<>"]+/g, (m) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;'
        }[m]));
    }
});
