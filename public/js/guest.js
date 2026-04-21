/* ============================================================
   guest.js — Guest page logic
   Avellano's Beach Hut Cottage
   ============================================================ */

// ── CMS CONTENT LOADER ───────────────────────────────────────────────────────
let _businessName = "Avellano's"; // global fallback
function applyContentMap(map) {
  document.querySelectorAll('[data-sc]').forEach(el => {
    const key = el.getAttribute('data-sc');
    if (map[key] !== undefined && map[key] !== '') {
      el.innerHTML = map[key];
    }
  });
  // Update browser tab and branding
  if (map['business_name']) {
    _businessName = map['business_name'];
    const chatTitle = document.getElementById('chatSupportTitle');
    if (chatTitle) chatTitle.textContent = `${_businessName}'s Support`;
    const preloaderLogo = document.getElementById('preloaderLogo');
    if (preloaderLogo) preloaderLogo.textContent = map['business_name'];
    document.title = map['business_name'] + ' – Luxury Beachfront Retreat';
  }

  // ── DYNAMIC DINING RENDERING ──────────────────────────────────────────────
  const diningGrid = document.getElementById('diningGrid');
  if (diningGrid && map['dining_list']) {
    try {
      const list = typeof map['dining_list'] === 'string' ? JSON.parse(map['dining_list']) : map['dining_list'];
      if (Array.isArray(list)) {
        diningGrid.innerHTML = list.map((d, idx) => `
          <div class="dining-card reveal-${idx % 2 === 0 ? 'left' : 'right'} visible">
            <div class="dining-img" style="background-image: url('${d.image || ''}'); background-size: cover; background-position: center;">
              ${!d.image ? '<span class="dining-emoji">' + (d.emoji || '🍴') + '</span>' : ''}
            </div>
            <div class="dining-body">
              <h3 class="dining-name">${d.name || 'New Dining'}</h3>
              <div class="dining-type">${d.type || 'Restaurant'}</div>
              <p class="dining-desc">${d.desc || ''}</p>
              <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem;">${d.hours || ''}</p>
              <a href="#contact" class="btn-menu">View Menu</a>
            </div>
          </div>
        `).join('');
      }
    } catch(e) { console.warn("Failed to render dining list:", e); }
  }

  // ── DYNAMIC ACTIVITIES RENDERING ──────────────────────────────────────────
  const activitiesGrid = document.getElementById('activitiesGrid');
  if (activitiesGrid && map['activities_list']) {
    try {
      const list = typeof map['activities_list'] === 'string' ? JSON.parse(map['activities_list']) : map['activities_list'];
      if (Array.isArray(list)) {
        activitiesGrid.innerHTML = list.map((a, idx) => `
          <div class="activity-card reveal stagger-${(idx % 4) + 1} visible">
            <span class="activity-icon">${a.icon || '✨'}</span>
            <div class="activity-name">${a.name || 'New Activity'}</div>
            <div class="activity-desc">${a.desc || ''}</div>
          </div>
        `).join('');
      }
    } catch(e) { console.warn("Failed to render activities list:", e); }
  }

  // ── DYNAMIC PERKS RENDERING ───────────────────────────────────────────────
  const perksGrid = document.getElementById('perksGrid');
  if (perksGrid && map['perks_list']) {
    try {
      const list = typeof map['perks_list'] === 'string' ? JSON.parse(map['perks_list']) : map['perks_list'];
      if (Array.isArray(list)) {
        perksGrid.innerHTML = list.map((p, idx) => `
          <div class="perk-item reveal stagger-${(idx % 5) + 1} visible">
            <span class="perk-icon">${p.icon || '✦'}</span>
            <div class="perk-title">${p.title || 'New Perk'}</div>
            <div class="perk-desc">${p.desc || ''}</div>
          </div>
        `).join('');
      }
    } catch(e) { console.warn("Failed to render perks list:", e); }
  }

  // ── DYNAMIC CONTACT RENDERING ─────────────────────────────────────────────
  const contactGrid = document.getElementById('contactGrid');
  if (contactGrid && map['contact_list']) {
    try {
      const list = typeof map['contact_list'] === 'string' ? JSON.parse(map['contact_list']) : map['contact_list'];
      if (Array.isArray(list)) {
        contactGrid.innerHTML = list.map(c => {
          const icon = getAutoIcon(c.label, c.link, c.icon);
          const isLink = !!c.link;
          const tag = isLink ? 'a' : 'div';
          const href = isLink ? `href="${c.link}" target="_blank"` : '';
          
          return `
            <${tag} ${href} class="contact-item" style="text-decoration: none; color: inherit; display: block;">
              <span class="contact-icon">${icon}</span>
              <div class="contact-label">${c.label || 'Contact'}</div>
              <div class="contact-value">${c.value || ''}</div>
            </${tag}>
          `;
        }).join('');
      }
    } catch(e) { console.warn("Failed to render contact list:", e); }
  }

  // ── DYNAMIC REVIEWS RENDERING ─────────────────────────────────────────────
  if (map['reviews_list']) {
    renderReviews(map);
  }

  // ── UPDATE GLOBAL CONTENT ──────────────────────────────────────────────────
  _siteContent = map;
  refreshVirtualTour();
}

let _siteContent = {};
let _rooms = [];

function refreshVirtualTour() {
  const tabs = document.getElementById('tourTabs');
  if (!tabs) return;

  const tourData = {};
  const html = [];

  // 1. Add Active Rooms
  _rooms.forEach(r => {
    const key = `room-${r.id}`;
    tourData[key] = {
      title: r.name,
      desc: r.desc || `Experience luxury in our ${r.name}. Designed for comfort and style.`,
      link: r.tourUrl || '#'
    };
    html.push(`<button class="tour-tab" data-bg="${key}" onclick="setTourBg(this)">${r.name}</button>`);
  });

  // 2. Add Restaurants from Dining List
  if (_siteContent['dining_list']) {
    try {
      const list = typeof _siteContent['dining_list'] === 'string' ? JSON.parse(_siteContent['dining_list']) : _siteContent['dining_list'];
      if (Array.isArray(list)) {
        list.forEach((d, idx) => {
          const type = (d.type || '').toLowerCase();
          if (type.includes('restaurant') || type.includes('dining')) {
            const key = `dining-${idx}`;
            tourData[key] = {
              title: d.name,
              desc: d.desc || `A culinary journey through Filipino heritage at ${d.name}.`,
              link: d.tourUrl || '#'
            };
            html.push(`<button class="tour-tab" data-bg="${key}" onclick="setTourBg(this)">${d.name}</button>`);
          }
        });
      }
    } catch (e) { }
  }

  // 3. Add Beach Area (Static Feature)
  tourData['tb-beach'] = {
    title: 'Beach Area',
    desc: 'Powdery white sand and crystal clear turquoise water. Your playground awaits.',
    link: '#'
  };
  html.push(`<button class="tour-tab" data-bg="tb-beach" onclick="setTourBg(this)">Beach Area</button>`);

  tabs.innerHTML = html.join('');
  window.TOUR_DATA = tourData;

  // Set first as active if none is active
  const active = tabs.querySelector('.tour-tab.active');
  if (!active && html.length > 0) {
    setTourBg(tabs.querySelector('.tour-tab'));
  }
}

function getAutoIcon(label = '', link = '', fallback = '📞') {
  const l = ((label || '') + (link || '')).toLowerCase().replace(/\s+/g, '');
  
  const svgStyle = 'width: 32px; height: 32px;';
  if (l.includes('facebook') || l.includes('fb.')) return `<svg style="${svgStyle}" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`;
  if (l.includes('instagram') || l.includes('ig.')) return `<svg style="${svgStyle}" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M7 2C4.23858 2 2 4.23858 2 7V17C2 19.7614 4.23858 22 7 22H17C19.7614 22 22 19.7614 22 17V7C22 4.23858 19.7614 2 17 2H7ZM12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7ZM12 9C13.6569 9 15 10.3431 15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9ZM17.25 5.75C17.25 6.24706 16.8471 6.65 16.35 6.65C15.8529 6.65 15.45 6.24706 15.45 5.75C15.45 5.25294 15.8529 4.85 16.35 4.85C16.8471 4.85 17.25 5.25294 17.25 5.75Z" clip-rule="evenodd"/></svg>`;
  if (l.includes('whatsapp') || l.includes('wa.me')) return `<svg style="${svgStyle}" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>`;
  
  if (l.includes('viber')) return '🟣';
  if (l.includes('tiktok')) return '🎵';
  if (l.includes('youtube')) return '📺';
  if (l.includes('twitter') || l.includes(' x ') || l.includes('t.co')) return '🐦';
  if (l.includes('phone') || l.includes('tel:') || l.includes('call')) return '📞';
  if (l.includes('email') || l.includes('mailto:')) return '📧';
  if (l.includes('location') || l.includes('maps') || l.includes('address')) return '📍';
  if (l.includes('clock') || l.includes('hours') || l.includes('time')) return '⏰';
  return fallback;
}

(async function loadSiteContent() {
  // 1. First, quickly apply cached branding to avoid "Avellanos" fallback
  const cache = localStorage.getItem('ABHC_siteContent');
  if (cache) {
    try {
      const parsed = JSON.parse(cache);
      if (parsed && parsed.data) {
        const map = {};
        parsed.data.forEach(i => { map[i.key] = i.value; });
        applyContentMap(map);
      }
    } catch(e) {}
  }

  try {
    // 2. Then, fetch fresh data from the server
    const items = await ABHC_DB.getSiteContent();
    if (!items || items.length === 0) return;
    const map = {};
    items.forEach(i => { map[i.key] = i.value; });
    applyContentMap(map);
    
    // Apply theme
    if (map['site_theme']) {
      document.documentElement.setAttribute('data-theme', map['site_theme']);
      localStorage.setItem('abhc_theme', map['site_theme']);
    }
    // Update the Google Maps button if coordinates have been set
    const mapBtn = document.getElementById('guestMapBtn');
    if (mapBtn && map['contact_map_url']) {
      mapBtn.setAttribute('onclick', `window.open('${map['contact_map_url']}','_blank')`);
    }

    // Trigger dynamic features based on coordinates
    if (map['business_coords']) {
      const coords = map['business_coords'];
      fetchWeather(coords);
      generateNearbyPlaces(coords);
      
      // Update embedded map iframe
      const mapIf = document.getElementById('guestMapIframe');
      if (mapIf) {
        const [lat, lon] = coords.split(',').map(c => c.trim());
        if (lat && lon) {
          mapIf.src = `https://maps.google.com/maps?q=${lat},${lon}&z=15&output=embed`;
          
          // Also update the click-to-open map link if a specific URL isn't provided
          if (mapBtn && !map['contact_map_url']) {
            mapBtn.setAttribute('onclick', `window.open('https://www.google.com/maps/search/?api=1&query=${lat},${lon}','_blank')`);
          }
        }
      }
    } else {
      fetchWeather(); // Fallback to defaults
    }
    // Save to cache for fast branding sync on next load
    localStorage.setItem('ABHC_siteContent', JSON.stringify({ data: items, time: Date.now() }));
    

    // ── HANDLE WEATHER VISIBILITY ──
    const weatherEnabled = map['weather_enabled'] !== 'false';
    const tideEnabled = map['tide_enabled'] === 'true';
    const strip = document.getElementById('weatherStrip');
    if (strip) strip.style.display = weatherEnabled ? 'flex' : 'none';
    const tideEl = document.getElementById('tideInfo');
    if (tideEl) tideEl.style.display = tideEnabled ? 'flex' : 'none';

  } catch (e) {
    console.warn('CMS content load skipped:', e.message);
    fetchWeather(); // Fallback
  }
})();

// ── WEATHER API & NEARBY PLACES ──────────────────────────────────────────────
async function fetchWeather(coordsStr) {
  try {
    let lat = 16.6627;
    let lon = 120.3204;
    if (coordsStr) {
      const parts = coordsStr.split(',');
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        lat = parseFloat(parts[0]);
        lon = parseFloat(parts[1]);
      }
    }

    // Fetch Weather & Sunset (Auto Timezone)
    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&daily=sunset&timezone=auto`);
    const wData = await weatherRes.json();

    if (wData.current) {
      const temp = Math.round(wData.current.temperature_2m);
      const hum = wData.current.relative_humidity_2m;
      const code = wData.current.weather_code;
      const sunset = new Date(wData.daily.sunset[0]).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

      document.getElementById('weatherTemp').textContent = `${temp}°C`;
      document.getElementById('weatherHumidity').textContent = `${hum}%`;
      document.getElementById('weatherSunset').textContent = sunset;

      const iconEl = document.getElementById('weatherIcon');
      const msgEl = document.getElementById('weatherMsg');

      if (code <= 3) {
        iconEl.textContent = '☀️';
        msgEl.textContent = 'Golden sun is out. Perfect for a dip! 🌊';
      } else if (code <= 65) {
        iconEl.textContent = '🌦️';
        msgEl.textContent = 'Tropical showers passing through. Cozy hut vibes! ☕';
      } else {
        iconEl.textContent = '⛈️';
        msgEl.textContent = 'The ocean is dancing. Stay safe and enjoy the rhythm! 🌩️';
      }
    }

    // Fetch Tide Data (Marine API)
    try {
      const marineRes = await fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=sea_level_height&length_unit=metric`);
      const mData = await marineRes.json();
      if (mData.hourly && mData.hourly.sea_level_height) {
        const heights = mData.hourly.sea_level_height;
        const now = new Date();
        const currentHour = now.getHours();
        
        const currentVal = heights[currentHour];
        const nextVal = heights[currentHour + 1] || currentVal;
        const prevVal = heights[currentHour - 1] || currentVal;

        let status = "Stable";
        if (currentVal > prevVal && currentVal > nextVal) status = "High";
        else if (currentVal < prevVal && currentVal < nextVal) status = "Low";
        else if (nextVal > currentVal) status = "Rising";
        else if (nextVal < currentVal) status = "Falling";

        document.getElementById('weatherTide').textContent = status + " Tide";
      } else {
        document.getElementById('weatherTide').textContent = "Moderate";
      }
    } catch (e) {
      document.getElementById('weatherTide').textContent = "Normal";
    }

  } catch (e) { console.error("Weather fetch failed", e); }
}

async function generateNearbyPlaces(coordsStr) {
  if (!coordsStr) return;
  const parts = coordsStr.split(',');
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return;
  const lat = parseFloat(parts[0]);
  const lon = parseFloat(parts[1]);

  const cacheKey = `ABHC_nearby_v8_${lat}_${lon}`;
  let nearbyData = null;
  const cachedStr = localStorage.getItem(cacheKey);
  if (cachedStr) {
    try {
      const parsed = JSON.parse(cachedStr);
      if (Date.now() - parsed.time < 86400000 * 7) { // 7 days cache
        nearbyData = parsed.data;
      }
    } catch(e) {}
  }

  if (!nearbyData) {
    try {
      // Expanded query for places that commonly appear on Google Maps
      const query = `
        [out:json][timeout:15];
        (
          nwr(around:5000,${lat},${lon})["amenity"="bus_station"];
          nwr(around:3000,${lat},${lon})["highway"="bus_stop"];
          nwr(around:5000,${lat},${lon})["tourism"="hotel"];
          nwr(around:5000,${lat},${lon})["tourism"="resort"];
          nwr(around:3000,${lat},${lon})["shop"="supermarket"];
          nwr(around:3000,${lat},${lon})["shop"="convenience"];
          nwr(around:3000,${lat},${lon})["amenity"="marketplace"];
          nwr(around:8000,${lat},${lon})["amenity"="hospital"];
          nwr(around:8000,${lat},${lon})["amenity"="police"];
        );
        out center;
      `;
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query
      });
      const data = await res.json();
      
      const items = { transport: null, hotel: null, market: null, hospital: null, police: null };

      // Haversine distance in km
      const getDist = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // km
        const dLat = (lat2-lat1) * Math.PI/180;
        const dLon = (lon2-lon1) * Math.PI/180;
        const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)*Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        // Add a 1.3x "road factor" to account for non-straight walking paths (more accurate than straight-line)
        return (R * c) * 1.3; 
      };

      const walkingSpeed = 5; // km/h (average walking speed)

      data.elements.forEach(el => {
        const elLat = el.lat || (el.center && el.center.lat);
        const elLon = el.lon || (el.center && el.center.lon);
        if (!elLat || !elLon) return;
        
        const dist = getDist(lat, lon, elLat, elLon);
        const name = el.tags.name || 'Local Spot';
        
        const checkMin = (cat, defaultName, sub) => {
          if (!items[cat] || dist < items[cat].dist) {
            items[cat] = { name: name === 'Local Spot' ? defaultName : name, dist, sub, speedKmh: walkingSpeed };
          }
        };

        const t = el.tags;
        if (t.amenity === 'bus_station' || t.highway === 'bus_stop') checkMin('transport', 'Transport Terminal', 'Local bus & jeepney hub');
        else if (t.tourism === 'hotel' || t.tourism === 'resort') checkMin('hotel', 'Nearby Hotel', 'Guest accommodations');
        else if (t.shop === 'supermarket' || t.shop === 'convenience' || t.amenity === 'marketplace') checkMin('market', 'Town Market', 'Local vendors & shops');
        else if (t.amenity === 'hospital') checkMin('hospital', 'Medical Center', '24/7 emergency services');
        else if (t.amenity === 'police') checkMin('police', 'Police Station', 'Emergency & public safety');
      });

      nearbyData = [
        items.transport || { name: 'Transport Terminal', dist: 3, sub: 'Local bus & jeepney hub', speedKmh: walkingSpeed },
        items.hotel || { name: 'Nearby Hotel', dist: 0.5, sub: 'Guest accommodations', speedKmh: walkingSpeed },
        items.market || { name: 'Town Market & Shops', dist: 1.5, sub: 'Local vendors & shops', speedKmh: walkingSpeed },
        items.hospital || { name: 'Medical Center', dist: 5, sub: '24/7 emergency services', speedKmh: walkingSpeed },
        items.police || { name: 'Police Station', dist: 2, sub: 'Emergency & public safety', speedKmh: walkingSpeed }
      ];

      const icons = ['🚌', '🏨', '🏪', '🏥', '👮'];
      nearbyData.forEach((d, i) => d.icon = icons[i]);

      localStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), data: nearbyData }));
    } catch (e) {
      console.warn("Overpass API failed:", e);
      return; // fallback to HTML defaults
    }
  }

  // Render to DOM
  const listEl = document.querySelector('.distance-list');
  if (listEl && nearbyData) {
    listEl.innerHTML = nearbyData.map(d => {
      const timeMins = Math.max(1, Math.ceil((d.dist / d.speedKmh) * 60));
      return `
        <li class="distance-item">
          <div class="distance-icon">${d.icon}</div>
          <div>
            <div class="distance-place">${d.name}</div>
            <div style="font-size:0.78rem;color:var(--text-muted);">${d.sub}</div>
          </div>
          <span class="distance-km">${timeMins} min</span>
        </li>
      `;
    }).join('');
  }
}

// ── INITIALIZE SUPABASE FOR LIVE CHAT ─────────────────────────────────────────

const SUPA_URL = 'https://aubuwrjwkfx' + 'hpuvtlggf.supabase.co';
const SUPA_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1YnV3cmp3' + 'a2Z4aHB1dnRsZ2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODE4NTcsImV4cCI6MjA5MTc1Nzg1N30.y0vw8T3Cpjfh4dQI8bgMh7iJ8mvERN0_MVoVg7v5zGA';
window.supa = window.supabase.createClient(SUPA_URL, SUPA_ANON_KEY);

// ── HELPERS ───────────────────────────────────────────────────────────────────
function fmtD(d) {
  if (!(d instanceof Date)) return d;
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function parseD(s) { const [y, m, dy] = s.split('-').map(Number); return new Date(y, m - 1, dy); }
function readableDate(s) { return parseD(s).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }); }

// ── CURSOR GLOW ───────────────────────────────────────────────────────────────
const glow = document.getElementById('cursor-glow');
document.addEventListener('mousemove', e => {
  glow.style.left = e.clientX + 'px';
  glow.style.top = e.clientY + 'px';
});

// ── STARS ─────────────────────────────────────────────────────────────────────
(function generateStars() {
  const sc = document.getElementById('starsContainer');
  for (let i = 0; i < 80; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 75}%;
      --dur:${2 + Math.random() * 4}s;--del:${Math.random() * 4}s;
      opacity:${0.15 + Math.random() * 0.85};
      width:${1 + Math.random() * 2}px;height:${1 + Math.random() * 2}px;`;
    sc.appendChild(s);
  }
})();

// ── NAV SCROLL ────────────────────────────────────────────────────────────────
const nav = document.getElementById('mainNav');
window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 80));

// ── SCROLL REVEAL ─────────────────────────────────────────────────────────────
const observer = new IntersectionObserver(
  entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
  { threshold: 0.1 }
);
document.querySelectorAll('.reveal,.reveal-left,.reveal-right').forEach(el => observer.observe(el));

// ── VIRTUAL TOUR ──────────────────────────────────────────────────────────────
// Initial Data (Will be overwritten by refreshVirtualTour)
window.TOUR_DATA = {
  'tb-beach': {
    title: 'Beach Area',
    desc: 'Powdery white sand and crystal clear turquoise water. Your playground awaits.',
    link: '#'
  }
};

function setTourBg(btn) {
  if (!btn) return;
  document.querySelectorAll('.tour-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const key = btn.dataset.bg;
  
  // Set background color/gradient based on key
  const bgEl = document.getElementById('tourBg');
  if (key.startsWith('room-')) bgEl.className = 'tour-bg tb-suite';
  else if (key.startsWith('dining-')) bgEl.className = 'tour-bg tb-restaurant';
  else bgEl.className = 'tour-bg ' + key;

  // Update text content with animation
  const title = document.getElementById('tourTitle');
  const desc = document.getElementById('tourDesc');

  if (!window.TOUR_DATA[key]) return;

  title.style.opacity = 0; desc.style.opacity = 0;
  setTimeout(() => {
    title.innerHTML = `Explore the <em>${window.TOUR_DATA[key].title}</em>`;
    desc.textContent = window.TOUR_DATA[key].desc;
    title.style.opacity = 1; desc.style.opacity = 1;
  }, 300);
}

function launchTour() {
  const activeTab = document.querySelector('.tour-tab.active');
  if (!activeTab) return;
  const key = activeTab.dataset.bg;
  const data = window.TOUR_DATA[key];
  if (!data) return;
  
  if (data.link && data.link !== '#') {
    window.open(data.link, '_blank');
  } else {
    alert(`Launching 360° VR Tour for: ${data.title}\n(Virtual Tour link not yet provided in Admin)`);
  }
}

// ── RENDER ROOMS SECTION ──────────────────────────────────────────────────────

async function renderRoomsSection() {
  const grid = document.getElementById('roomsGrid');
  // Skeleton Loader
  grid.innerHTML = Array(3).fill(0).map((_, i) => `<div class="room-card skeleton stagger-${i+1}" style="height:450px;"></div>`).join('');
  
  _rooms = (await ABHC_DB.getRooms()).filter(r => r.active);
  refreshVirtualTour();
  
  grid.innerHTML = _rooms.map((r, i) => `
    <article class="room-card reveal stagger-${i + 1}">
      <div class="room-img ${r.img}">
        <div class="room-img ${r.img ? 'has-photo' : r.img || 'cottage'}">
  ${r.img ? `<img src="${r.img}" alt="${r.name}">` : `<div class="room-img-inner">${r.badge || '🏠'}</div>`}
        <span class="room-badge">${r.badge}</span>
      </div>
      <div class="room-body">
        <h3 class="room-name">${r.name}</h3>
        <p class="room-capacity">👤 ${r.cap}</p>
        <div class="room-amenities">${(r.amenities || []).map(a => `<span class="amenity-tag">${a}</span>`).join('')}</div>
        <div class="room-footer">
          <div>
            <span class="price-amount" style="font-size:1.1rem;">₱${(r.price12h || 0).toLocaleString()}</span><span class="price-per">/12h</span>
            <span style="color:var(--sand-mid);margin:0 4px;">|</span>
            <span class="price-amount" style="font-size:1.1rem;">₱${(r.price24h || 0).toLocaleString()}</span><span class="price-per">/24h</span>
          </div>
          <a href="#booking" class="btn-room">Book Room</a>
        </div>
      </div>
    </article>`).join('');
  grid.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}
renderRoomsSection();

// ── REVIEWS ───────────────────────────────────────────────────────────────────
const REVIEWS = [
  { stars: 5, text: 'Absolute magic. Woke up to ocean sounds every morning — felt like a dream we never wanted to leave.', guest: 'Maria S. · Manila' },
  { stars: 5, text: 'The staff remembered my coffee order on day two. That kind of warmth is rare anywhere in the world.', guest: 'James T. · Singapore' },
  { stars: 5, text: 'Our anniversary here was the most romantic trip we\'ve ever taken. The sunset villa is breathtaking.', guest: 'Ana & Carlo M. · Cebu' },
  { stars: 5, text: 'Kids loved the island hopping, adults loved the cocktails. Everyone was happy. Perfect family getaway.', guest: 'The Reyes Family · Makati' },
  { stars: 4, text: 'Pristine beach, crystal water, and the freshest seafood I\'ve ever tasted. We\'re coming back every year.', guest: 'Sophie L. · Paris' },
  { stars: 5, text: 'From booking to checkout, everything was seamless and thoughtful. This place truly cares about guests.', guest: 'Daniel K. · London' },
];
function renderReviews(cmsMap) {
  const track = document.getElementById('reviewsTrack');
  if (!track) return;

  let list = REVIEWS; // Default fallback
  if (cmsMap && cmsMap['reviews_list']) {
    try {
      list = typeof cmsMap['reviews_list'] === 'string' ? JSON.parse(cmsMap['reviews_list']) : cmsMap['reviews_list'];
    } catch (e) { console.warn("Failed to parse reviews list:", e); }
  }

  const doubled = [...list, ...list];
  track.innerHTML = doubled.map(r => `
    <div class="review-card">
      <div class="review-stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div>
      <p class="review-text">"${r.text}"</p>
      <div class="review-guest">— ${r.guest}</div>
    </div>`).join('');
}
// Initial call with fallback
renderReviews();

// ── BOOKING STATE ─────────────────────────────────────────────────────────────
let ROOMS = [];
let selIn = null;
let selOut = null;
let cart = {};
let off1 = 0, off2 = 1;

// Helper to update the cart quantities
function updateCart(id, delta, maxAvail) {
  cart[id] = (cart[id] || 0) + delta;
  if (cart[id] < 0) cart[id] = 0;
  if (cart[id] > maxAvail) cart[id] = maxAvail;
  renderRoomsTab();
}

// ── CALENDAR ──────────────────────────────────────────────────────────────────
async function renderCal(id, offset) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const base = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const yr = base.getFullYear(), mo = base.getMonth();
  const mName = base.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const firstDay = new Date(yr, mo, 1).getDay();
  const daysInMo = new Date(yr, mo + 1, 0).getDate();
  const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  let h = `<div class="cal-header">
    <button class="cal-nav" onclick="shiftCal('${id}',${offset},-1)">‹</button>
    <div class="cal-title">${mName}</div>
    <button class="cal-nav" onclick="shiftCal('${id}',${offset},1)">›</button>
  </div><div class="cal-grid">
  ${DOW.map(d => `<div class="cal-dow">${d}</div>`).join('')}`;

  for (let i = 0; i < firstDay; i++) h += `<div class="cal-day empty"></div>`;

  for (let d = 1; d <= daysInMo; d++) {
    const date = new Date(yr, mo, d);
    const ds = fmtD(date);
    const isPast = date < today;
    const isToday = ds === fmtD(today);
    const allBk = await ABHC_DB.allBooked(date);

    let cls = 'cal-day';
    if (isPast) cls += ' past';
    else if (allBk) cls += ' unavailable';
    else if (isToday) cls += ' today';

    if (selIn && selOut) {
      const ci = parseD(selIn), co = parseD(selOut);
      if (ds === selIn) cls += ' selected-in';
      else if (ds === selOut) cls += ' selected-out';
      else if (date > ci && date < co) cls += ' in-range';
    } else if (selIn && ds === selIn) {
      cls += ' selected-in';
    }

    const clickable = !isPast && !allBk;
    h += `<div class="${cls}"${clickable ? ` onclick="dayClick('${ds}')"` : ''}>${d}</div>`;
  }

  h += '</div>';
  document.getElementById(id).innerHTML = h;
}

function shiftCal(id, offset, dir) {
  if (id === 'cal1') { off1 = Math.max(0, off1 + dir); renderCal('cal1', off1); }
  else { off2 = Math.max(0, off2 + dir); renderCal('cal2', off2); }
}

async function dayClick(ds) {
  if (!selIn || (selIn && selOut)) {
    selIn = ds; selOut = null; selRoom = null;
  } else {
    if (ds <= selIn) { selIn = ds; selOut = null; }
    else { selOut = ds; }
  }
  await renderCal('cal1', off1);
  await renderCal('cal2', off2);
  updateSummary();
}

function updateSummary() {
  const area = document.getElementById('booking-summary-area');
  const btn = document.getElementById('btnToRoom');
  if (!selIn || !selOut) {
    area.innerHTML = `<div style="text-align:center;padding:3rem 1rem;color:var(--text-muted);">
      <div style="font-size:3rem;margin-bottom:1rem;">🗓️</div>
      <p style="font-size:0.95rem;">Click a <strong>check-in</strong> date, then a <strong>check-out</strong> date to see your stay summary.</p>
    </div>`;
    btn.style.display = 'none';
    return;
  }
  const nights = Math.round((parseD(selOut) - parseD(selIn)) / 86400000);
  area.innerHTML = `
    <div class="booking-summary">
      <div class="summary-row"><span class="summary-label">Check-in</span><span>${readableDate(selIn)}</span></div>
      <div class="summary-row"><span class="summary-label">Check-out</span><span>${readableDate(selOut)}</span></div>
      <div class="summary-row"><span class="summary-label">Duration</span><span>${nights} night${nights !== 1 ? 's' : ''}</span></div>
    </div>`;
  btn.style.display = 'block';
}

// ── BOOKING TABS ──────────────────────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.booking-tab,.booking-tab-pane').forEach(el => el.classList.remove('active'));
  document.getElementById('tabBtn-' + tab).classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
  if (tab === 'room') renderRoomsTab();
  if (tab === 'calendar') { renderCal('cal1', off1); renderCal('cal2', off2); updateSummary(); }
  if (tab === 'confirm') renderConfirm();
}

async function renderRoomsTab() {
  ROOMS = (await ABHC_DB.getRooms()).filter(r => r.active);
  const banner = document.getElementById('dateRangeBanner');
  const sel = document.getElementById('roomSelector');
  const btn = document.getElementById('btnToConfirm');

  if (!selIn || !selOut) {
    banner.textContent = '⚠️ Please select your dates first.';
    sel.innerHTML = ''; btn.style.display = 'none'; return;
  }

  const ci = parseD(selIn), co = parseD(selOut);
  const nights = Math.round((co - ci) / 86400000);
  banner.innerHTML = `📅 <strong>${readableDate(selIn)}</strong> → <strong>${readableDate(selOut)}</strong> &nbsp;·&nbsp; ${nights} night${nights !== 1 ? 's' : ''}`;

  const availResults = await Promise.all(ROOMS.map(r => ABHC_DB.getRoomAvailability(r.id, ci, co)));
  const allBookings = await ABHC_DB.getBookings();

  sel.innerHTML = ROOMS.map((r, i) => {
    const avail = availResults[i];
    const qtyInCart = cart[r.id] || 0;
    const total = (r.price24h * nights * qtyInCart).toLocaleString();

    let unitSelectHtml = '';
    const bookedUnits = new Set();
    let d = new Date(ci);
    const end = new Date(co);
    while (d < end) {
      allBookings.forEach(b => {
        if (b.status === 'cancelled') return;
        if ((b.room_id || b.roomId) !== r.id) return;
        const bCi = new Date(b.check_in || b.checkIn);
        const bCo = new Date(b.check_out || b.checkOut);
        if (d >= bCi && d < bCo) {
          const reqText = b.special_req || b.specialReq || '';
          const match = reqText.match(/\[Preferred Unit:\s*(.*?)\]/);
          if (match) bookedUnits.add(match[1].trim());
        }
      });
      d.setDate(d.getDate() + 1);
    }

    if (qtyInCart > 0 && r.unitIds && r.unitIds.length > 0) {
      let availableUnits = r.unitIds.filter(u => !bookedUnits.has(u));
      if (availableUnits.length > avail) availableUnits = availableUnits.slice(0, avail);
      const options = availableUnits.map(u => `<option value="${u}">${u}</option>`).join('');
      unitSelectHtml = `
        <div style="margin-top:1.2rem;text-align:left;">
          <label style="font-size:0.75rem;color:var(--text-muted);display:block;margin-bottom:0.3rem;">Select Unit Preference (Optional)</label>
          <select id="prefUnit_${r.id}" style="width:100%;padding:0.5rem;font-size:0.85rem;border:1.5px solid var(--sand-mid);border-radius:8px;outline:none;">
            <option value="">Any available unit</option>
            ${options}
          </select>
        </div>`;
    }

    return `<div class="room-option ${avail === 0 ? 'unavail-room' : ''}" style="cursor:default;">
      <span class="room-opt-badge ${avail > 0 ? 'avail-badge' : 'unavail-badge'}">${avail > 0 ? `✅ ${avail} Available` : '❌ Fully Booked'}</span>
      ${r.img ? `<img class="room-opt-photo" src="${r.img}" alt="${r.name}">` : `<div class="room-opt-emoji">🏠</div>`}
      <div class="room-opt-name">${r.name}</div>
      <div class="room-opt-price">₱${r.price24h.toLocaleString()} / night</div>
      <div class="room-opt-cap">👤 ${r.cap}</div>
      
      <div style="display:flex;align-items:center;justify-content:center;gap:1.2rem;margin-top:1rem;">
        <button class="btn btn-ghost btn-sm" style="width:36px;height:36px;padding:0;display:flex;align-items:center;justify-content:center;font-size:1.5rem;line-height:0;" onclick="updateCart('${r.id}', -1, ${avail})" ${qtyInCart === 0 ? 'disabled' : ''}>&minus;</button>
        <span style="font-weight:600;font-size:1.2rem;width:24px;text-align:center;">${qtyInCart}</span>
        <button class="btn btn-primary btn-sm" style="width:36px;height:36px;padding:0;display:flex;align-items:center;justify-content:center;font-size:1.4rem;line-height:0;" onclick="updateCart('${r.id}', 1, ${avail})" ${qtyInCart === avail ? 'disabled' : ''}>+</button>
      </div>
      
      ${qtyInCart > 0 ? `<div class="room-opt-total">Room Subtotal: ₱${total}</div>` : ''}
      ${unitSelectHtml}
    </div>`;
  }).join('');

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  btn.style.display = totalItems > 0 ? 'block' : 'none';
}


function pickRoom(id) {
  selRoom = id;
  renderRoomsTab();
  document.getElementById('btnToConfirm').style.display = 'block';
}

function renderConfirm() {
  const div = document.getElementById('confirmSummary');

  // Calculate total items in cart to check if they selected anything
  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);

  if (!selIn || !selOut || totalItems === 0) {
    div.innerHTML = '<p style="color:var(--text-muted);">Please complete the previous steps first.</p>';
    return;
  }

  const nights = Math.round((parseD(selOut) - parseD(selIn)) / 86400000);

  let totalSub = 0;
  let roomBreakdownHtml = '';

  // Loop through the cart and build a line item for each room they selected
  Object.keys(cart).forEach(id => {
    if (cart[id] > 0) {
      const r = ROOMS.find(room => room.id === id);
      const roomSub = r.price24h * nights * cart[id];
      totalSub += roomSub;
      roomBreakdownHtml += `<div class="summary-row"><span class="summary-label">${cart[id]}x ${r.name}</span><span>₱${roomSub.toLocaleString()}</span></div>`;
    }
  });

  // Replace the old tax math with this:
  const tax = totalSub * 0.12;
  const grandTotal = totalSub;

  div.innerHTML = `
    <div style="font-family:var(--font-serif);font-size:1.1rem;color:var(--text-dark);margin-bottom:1rem;">Booking Summary</div>
    <div class="summary-row"><span class="summary-label">Check-in</span><span>${readableDate(selIn)}</span></div>
    <div class="summary-row"><span class="summary-label">Check-out</span><span>${readableDate(selOut)}</span></div>
    <div class="summary-row"><span class="summary-label">Nights</span><span>${nights}</span></div>
    <hr style="border:none;border-top:1px dashed var(--sand-mid);margin:0.5rem 0;">
    ${roomBreakdownHtml}
    <hr style="border:none;border-top:1px dashed var(--sand-mid);margin:0.5rem 0;">
    <div class="summary-row"><span class="summary-label">Tax (12% VAT Included)</span><span>₱${tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
    <div class="summary-row"><span class="summary-label">Total (Tax Inclusive)</span><span style="font-size:1.1rem;color:var(--aqua-deep);font-weight:600;">₱${grandTotal.toLocaleString()}</span></div>`;
}

// ── FLAGGED GUEST CHECK ───────────────────────────────────────────────────────
let flagAlertShown = false;
async function checkFlagged() {
  const fn = document.getElementById('guestFname').value.trim();
  const ln = document.getElementById('guestLname').value.trim();
  const em = document.getElementById('guestEmail').value.trim();
  if (!fn && !ln && !em) return;

  const flagged = await ABHC_DB.isGuestFlagged(em, fn, ln);
  const warn = document.getElementById('flaggedWarning');
  const msg = document.getElementById('flaggedMsg');

  if (flagged) {
    warn.classList.add('show');
    msg.textContent = `This guest has been flagged: ${flagged.reason || 'Property damage reported'}. Admin has been notified.`;
    if (!flagAlertShown) {
      flagAlertShown = true;
      setTimeout(() => {
        document.getElementById('flagModalMsg').textContent =
          `Guest "${fn} ${ln}" (${em}) appears in the flagged guest list. Reason: ${flagged.reason || 'Property damage reported'}. Please review before confirming.`;
        document.getElementById('flagModal').classList.add('open');
      }, 600);
    }
  } else {
    warn.classList.remove('show');
  }
}

function closeFlagModal() {
  document.getElementById('flagModal').classList.remove('open');
}

// ── SUBMIT RESERVATION ────────────────────────────────────────────────────────
async function submitReservation() {
  const fn = document.getElementById('guestFname').value.trim();
  const ln = document.getElementById('guestLname').value.trim();
  const em = document.getElementById('guestEmail').value.trim();
  const ph = document.getElementById('guestPhone').value.trim();
  const req = document.getElementById('guestReq').value.trim();

  if (!fn || !ln || !em) { showToast('Please fill in your name and email to proceed.', 'warning'); return; }

  // Make sure they have selected at least one room
  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  if (!selIn || !selOut || totalItems === 0) { showToast('Please complete all steps and select at least one room.', 'warning'); return; }

  const nights = Math.round((parseD(selOut) - parseD(selIn)) / 86400000);
  const ref = 'ABHC-' + Date.now().toString(36).toUpperCase().slice(-6);

  const bookingsArray = [];
  let grandTotal = 0;
  let roomNamesHtml = '';

  // Loop through cart to build individual booking records
  Object.keys(cart).forEach(id => {
    if (cart[id] > 0) {
      const r = ROOMS.find(room => room.id === id);
      const sub = r.price24h * nights * cart[id];
      const tax = Math.round(sub - sub / 1.12); // Extract VAT from tax-inclusive price
      const total = sub;

      grandTotal += total;
      roomNamesHtml += `<div>${cart[id]}x ${r.name}</div>`;

      // Grab their unit preference if they selected one
      const prefDropdown = document.getElementById(`prefUnit_${id}`);
      const preferredUnit = prefDropdown ? prefDropdown.value : '';

      // Attach the preference to their special requests so it shows up on your admin panel!
      let finalReq = req;
      if (preferredUnit) {
        finalReq = finalReq ? `[Preferred Unit: ${preferredUnit}] - ${finalReq}` : `[Preferred Unit: ${preferredUnit}]`;
      }

      bookingsArray.push({
        ref, roomId: r.id, roomName: r.name, roomQuantity: cart[id],
        guestName: fn + ' ' + ln, guestFname: fn, guestLname: ln,
        guestEmail: em, guestPhone: ph, checkIn: selIn, checkOut: selOut,
        nights, subtotal: sub, tax, total,
        specialReq: finalReq, // Saved here!
        notes: '', repairCost: 0, status: 'confirmed', flagged: false,
        createdAt: new Date().toISOString(),
      });
    }
  });

  // Send the array to Supabase
  try {
    await ABHC_DB.addBooking(bookingsArray);
  } catch (err) {
    showToast('Booking failed: ' + err.message, 'error');
    return;
  }

  // Build the success modal receipt
  document.getElementById('modalSub').textContent = `Thank you, ${fn}! A confirmation will be sent to ${em}.`;
  document.getElementById('modalDetails').innerHTML = `
    <div class="modal-detail-row"><span class="modal-detail-label">Reference</span><span class="ref-num">${ref}</span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">Guest</span><span class="modal-detail-val">${fn} ${ln}</span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">Rooms</span><span class="modal-detail-val" style="text-align:right;">${roomNamesHtml}</span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">Check-in</span><span class="modal-detail-val">${readableDate(selIn)}</span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">Check-out</span><span class="modal-detail-val">${readableDate(selOut)}</span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">Nights</span><span class="modal-detail-val">${nights}</span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">Total (incl. tax)</span><span class="modal-detail-val" style="color:var(--aqua-deep);font-weight:600;">₱${grandTotal.toLocaleString()}</span></div>`;

  document.getElementById('bookingModal').classList.add('open');

  // Reset state (Empty the cart!)
  selIn = null; selOut = null; cart = {}; flagAlertShown = false;
  renderCal('cal1', off1); renderCal('cal2', off2); updateSummary();
  ['guestFname', 'guestLname', 'guestEmail', 'guestPhone', 'guestReq'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('flaggedWarning').classList.remove('show');
}

// ── GUEST PHOTO FEED ──────────────────────────────────────────────────────────

async function loadApprovedFeed() {
  const container = document.getElementById('liveGuestFeed');
  if (!container) return;
  
  // Skeleton Loader
  container.innerHTML = Array(4).fill(0).map(() => `<div class="room-card skeleton" style="height:300px;border-radius:12px;"></div>`).join('');
  
  try {
    const res = await fetch('/api/guest-feed?status=approved');
    const posts = await res.json();

    container.innerHTML = posts.map(p => `
      <div class="room-card" style="border-radius:12px;overflow:hidden;background:white;">
        <img src="${p.image_url}" style="width:100%;height:220px;object-fit:cover;display:block;">
        <div style="padding:1rem;">
          <p style="font-size:0.85rem;color:var(--text-dark);font-style:italic;margin-bottom:0.5rem;">"${p.caption}"</p>
          <div style="font-size:0.75rem;color:var(--text-muted);font-weight:500;">— ${p.guest_name}</div>
        </div>
      </div>
    `).join('');
  } catch (e) { console.error("Failed to load feed", e); }
}

async function submitFeedPost() {
  const name = document.getElementById('feedName').value.trim();
  const refNo = document.getElementById('feedRef').value.trim();
  const caption = document.getElementById('feedCaption').value.trim();
  const fileInput = document.getElementById('feedPhoto');
  const btn = document.getElementById('feedSubmitBtn');

  if (!name || !fileInput.files[0]) {
    showToast("Please provide your name and select a photo!", 'warning');
    return;
  }

  btn.textContent = "Uploading...";
  btn.disabled = true;

  const file = fileInput.files[0];
  const ext = file.name.split('.').pop();
  const reader = new FileReader();

  reader.onload = async (e) => {
    const payload = {
      guestName: name,
      guestRef: refNo,       // <-- Sending the new Reference Number
      caption: caption,
      imageBase64: e.target.result,
      imageExt: ext
    };

    try {
      const res = await fetch('/api/guest-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Upload failed');

      // The new success message!
      showToast("Your post has been submitted and will be reviewed for approval. Thank you for sharing your story!", 'success');

      // Clear the form
      document.getElementById('feedName').value = '';
      document.getElementById('feedRef').value = '';
      document.getElementById('feedCaption').value = '';
      fileInput.value = '';

      // Hide the form and bring the "Share your story" button back
      document.getElementById('feedFormContainer').style.display = 'none';
      document.getElementById('openFeedFormBtn').style.display = 'inline-block';

    } catch (err) {
      showToast("Error: " + err.message, 'error');
    } finally {
      btn.textContent = "Submit Story";
      btn.disabled = false;
    }
  };
  reader.readAsDataURL(file);
}

// Load the feed when the page starts
loadApprovedFeed();



// ── GUEST CHAT WIDGET ─────────────────────────────────────────────────────────
let chatCaseId = localStorage.getItem('abhc_chat_case_id');
let kbData = [];
let botMode = !chatCaseId;
let guestRealtimeChannel = null;

// --- NOTIFICATION SOUND ---
let audioCtx = null;
let lastSoundTime = 0;
function playNotificationSound() {
  const now = Date.now();
  if (now - lastSoundTime < 1000) return; // Prevent double ding
  lastSoundTime = now;

  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.1); // C6

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  } catch (e) { console.error("Audio API not supported or blocked", e); }
}

// Initialize session on page load if they refreshed
document.addEventListener('DOMContentLoaded', async () => {
  if (chatCaseId) {
    const cases = await ABHC_DB.getSupportCases();
    const myCase = cases.find(c => c.case_id === chatCaseId);
    // If case exists and isn't closed/resolved/abandoned, restore it!
    if (myCase && !['closed', 'resolved', 'abandoned'].includes(myCase.status)) {
      botMode = false;
      document.getElementById('guestEndChatBtn').style.display = 'inline-block';
      const msgs = await ABHC_DB.getSupportMessages(chatCaseId);
      const body = document.getElementById('guestChatBody');
      body.innerHTML = '';
      msgs.forEach(m => {
        if (m.sender_type === 'system' && m.message.includes('ownership transferred')) return;
        const type = m.sender_type === 'guest' ? 'guest' : (m.sender_type === 'system' ? 'sys' : 'bot');
        appendMsg(type, m.message, m.created_at);
      });
      setupGuestRealtime();
    } else {
      endGuestChat(true); // Silent clean up if admin already closed it
    }
  }
});

async function toggleGuestChat() {
  const win = document.getElementById('guestChatWindow');
  win.classList.toggle('open');
  if (win.classList.contains('open') && document.getElementById('guestChatBody').innerHTML === '') {
    kbData = await ABHC_DB.getKB();
    appendMsg('bot', `Hi! I'm the ${_businessName}'s virtual assistant. How can I help you today?`);
  }
}

// Added Timestamp logic!
function appendMsg(type, text, timestamp = new Date().toISOString()) {
  const timeStr = new Date(timestamp).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  const body = document.getElementById('guestChatBody');
  body.innerHTML += `
    <div class="chat-msg msg-${type}">
      ${text}
      ${type !== 'sys' ? `<div style="font-size:0.6rem; opacity:0.6; text-align:right; margin-top:4px;">${timeStr}</div>` : ''}
    </div>`;
  body.scrollTop = body.scrollHeight;
}

async function sendGuestMsg() {
  const input = document.getElementById('guestChatInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  // OPTIMISTIC UI: Show message instantly!
  appendMsg('guest', text);

  if (botMode) {
    const match = kbData.find(k => k.keywords.split(',').some(kw => text.toLowerCase().includes(kw.trim())));
    setTimeout(() => {
      playNotificationSound();
      if (match) {
        appendMsg('bot', match.answer);
      } else {
        appendMsg('bot', "I'm not exactly sure about that. Would you like me to connect you to a human agent?");
        const body = document.getElementById('guestChatBody');
        body.innerHTML += `<button class="btn btn-sm btn-ghost" style="align-self:flex-start;margin-top:-0.5rem;" onclick="showPreChatForm(this)">Yes, connect me</button>`;
        body.scrollTop = body.scrollHeight;
      }
    }, 600);
  } else if (chatCaseId) {
    // Fire and forget (syncs to DB in background)
    ABHC_DB.sendSupportMessage({ case_id: chatCaseId, sender_type: 'guest', sender_name: 'Guest', message: text });
  }
}

function showPreChatForm(btn) {
  btn.style.display = 'none';
  const body = document.getElementById('guestChatBody');
  body.innerHTML += `
    <div class="prechat-form" id="prechatForm">
      <div style="font-size:0.8rem;font-weight:600;margin-bottom:0.5rem;">Connect with an Agent</div>
      <input type="text" id="pcName" class="chat-input" placeholder="Name (Required)">
      <input type="email" id="pcEmail" class="chat-input" placeholder="Email (Required)">
      <input type="text" id="pcPhone" class="chat-input" placeholder="Phone (Optional)">
      <input type="text" id="pcRef" class="chat-input" placeholder="Booking Ref (Optional)">
      <textarea id="pcConcern" class="chat-input" rows="2" placeholder="Briefly describe your concern..."></textarea>
      <button class="btn btn-primary btn-sm" onclick="submitPreChat()">Start Chat</button>
    </div>`;
  body.scrollTop = body.scrollHeight;
}

async function submitPreChat() {
  const name = document.getElementById('pcName').value.trim();
  const email = document.getElementById('pcEmail').value.trim();
  const concern = document.getElementById('pcConcern').value.trim();
  const phone = document.getElementById('pcPhone').value.trim();
  const ref = document.getElementById('pcRef').value.trim();

  if (!name || !email) return showToast("Name and Email are required.", 'warning');

  document.getElementById('prechatForm').style.display = 'none';
  appendMsg('sys', 'Creating case...');

  const newId = 'CS-' + Date.now().toString(36).toUpperCase().slice(-5);
  await ABHC_DB.createSupportCase({
    case_id: newId, guest_name: name, guest_email: email,
    guest_phone: phone,
    ref_no: ref,
    concern: concern
  });

  if (concern) {
    await ABHC_DB.sendSupportMessage({
      case_id: newId,
      sender_type: 'guest',
      sender_name: name,
      message: concern
    });
  }

  chatCaseId = newId;
  botMode = false;
  localStorage.setItem('abhc_chat_case_id', newId); // Protect against refreshes!
  document.getElementById('guestEndChatBtn').style.display = 'inline-block';

  appendMsg('sys', `Case ${newId} created. Please wait for an agent...`);
  setupGuestRealtime();
}

function setupGuestRealtime() {
  // Use polling as a fallback if realtime publication isn't enabled on the DB
  if (!window.guestPollInterval) {
    window.guestMsgCount = -1; // Uninitialized
    window.guestPollInterval = setInterval(async () => {
      if (!chatCaseId || botMode) return;
      try {
        const msgs = await ABHC_DB.getSupportMessages(chatCaseId);
        const filtered = msgs.filter(m => !(m.sender_type === 'system' && m.message.includes('ownership transferred')));
        
        if (window.guestMsgCount === -1) {
          window.guestMsgCount = filtered.length;
        } else if (filtered.length > window.guestMsgCount) {
          const newMsgs = filtered.slice(window.guestMsgCount);
          newMsgs.forEach(m => {
            if (m.sender_type !== 'guest') {
              const typeMap = { 'system': 'sys', 'bot': 'bot', 'staff': 'bot' };
              const isClosureMsg = m.sender_type === 'system' &&
                (m.message.includes('RESOLVED') || m.message.includes('ABANDONED') || m.message.includes('CLOSED'));
              const displayMsg = isClosureMsg ? '[ Staff has left the conversation ]' : m.message;
              appendMsg(typeMap[m.sender_type], displayMsg, m.created_at);
              playNotificationSound();
              
              if (isClosureMsg) {
                document.getElementById('guestChatInputArea').innerHTML = `
                  <div style="text-align:center;width:100%;font-size:0.85rem;padding:0.5rem 0;display:flex;flex-direction:column;align-items:center;gap:0.5rem;">
                    <span style="color:var(--text-muted);">This chat has been closed.</span>
                    <button class="btn btn-primary btn-sm" onclick="startNewGuestChat()">Start New Chat</button>
                  </div>`;
                document.getElementById('guestEndChatBtn').style.display = 'none';
                localStorage.removeItem('abhc_chat_case_id');
                chatCaseId = null;
                botMode = true;
                clearInterval(window.guestPollInterval);
                window.guestPollInterval = null;
              }
            }
          });
          window.guestMsgCount = filtered.length;
        }
      } catch (e) {}
    }, 3000);
  }

  if (!guestRealtimeChannel) {
    guestRealtimeChannel = window.supa.channel(`guest-chat-${chatCaseId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `case_id=eq.${chatCaseId}` }, (payload) => {
        // Fallback already handles this via polling to guarantee delivery
      }).subscribe();
  }
}

function startNewGuestChat() {
  endGuestChat(true); // Silently close the UI and wipe variables
  toggleGuestChat(); // Re-open the widget immediately as a fresh bot chat
}

async function endGuestChat(silent = false) {
  if (chatCaseId && !botMode && !silent) {
    try {
      document.getElementById('guestChatInputArea').innerHTML = `<div style="text-align:center;width:100%;font-size:0.8rem;color:var(--text-muted);">Closing chat...</div>`;
      await ABHC_DB.updateSupportCase(chatCaseId, { status: 'closed', closed_at: new Date().toISOString() });
      await ABHC_DB.sendSupportMessage({ case_id: chatCaseId, sender_type: 'system', sender_name: 'System', message: 'Guest marked the conversation as resolved and ended the chat.' });
    } catch (err) {
      console.error("Failed to update case status on end chat:", err);
    }

    // Lock the UI instead of wiping the chat body
    document.getElementById('guestChatInputArea').innerHTML = `
      <div style="text-align:center;width:100%;font-size:0.85rem;padding:0.5rem 0;display:flex;flex-direction:column;align-items:center;gap:0.5rem;">
        <span style="color:var(--text-muted);">This chat has been closed.</span>
        <button class="btn btn-primary btn-sm" onclick="startNewGuestChat()">Start New Chat</button>
      </div>`;
    document.getElementById('guestEndChatBtn').style.display = 'none';
    localStorage.removeItem('abhc_chat_case_id');
    chatCaseId = null;
    botMode = true;
    if (guestRealtimeChannel) { window.supa.removeChannel(guestRealtimeChannel); guestRealtimeChannel = null; }

    return; // Keep the window open and history visible
  }

  // SILENT CLEANUP (used when page reloads or "Start New Chat" is clicked)
  localStorage.removeItem('abhc_chat_case_id');
  chatCaseId = null; botMode = true;
  document.getElementById('guestChatBody').innerHTML = '';
  document.getElementById('guestEndChatBtn').style.display = 'none';
  document.getElementById('guestChatInputArea').innerHTML = `
    <input type="text" id="guestChatInput" autocomplete="off" class="chat-input" placeholder="Type a message..." onkeypress="if(event.key==='Enter') sendGuestMsg()">
    <button class="chat-send" onclick="sendGuestMsg()">➤</button>
  `;
  if (guestRealtimeChannel) { window.supa.removeChannel(guestRealtimeChannel); guestRealtimeChannel = null; }
  document.getElementById('guestChatWindow').classList.remove('open');
}

// ── INIT CALENDARS ────────────────────────────────────────────────────────────
renderCal('cal1', off1);
renderCal('cal2', off2);

// ── UX ENHANCEMENTS (Preloader, Scroll Progress, Magnetic, Toast) ─────────────

// Toast Implementation
function showToast(message, type = 'success', duration = 4000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️'}</span>
    <span style="flex:1;">${message}</span>
    <div class="toast-progress"></div>
  `;
  container.appendChild(toast);
  
  // Progress bar animation
  const progress = toast.querySelector('.toast-progress');
  progress.style.transition = `transform ${duration}ms linear`;
  setTimeout(() => progress.style.transform = 'scaleX(0)', 10);
  
  // Swipe to dismiss
  let startX = 0;
  toast.addEventListener('touchstart', e => startX = e.touches[0].clientX);
  toast.addEventListener('touchmove', e => {
    const diffX = e.touches[0].clientX - startX;
    if (diffX > 0) toast.style.transform = `translateX(${diffX}px)`;
  });
  toast.addEventListener('touchend', e => {
    if (e.changedTouches[0].clientX - startX > 50) {
      toast.style.animation = 'toastOut 0.3s forwards';
      setTimeout(() => toast.remove(), 300);
    } else {
      toast.style.transform = 'translateX(0)';
    }
  });

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.animation = 'toastOut 0.35s forwards';
      setTimeout(() => toast.remove(), 350);
    }
  }, duration);
}

// Preloader Fade-out
window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    setTimeout(() => {
      preloader.classList.add('fade-out');
      setTimeout(() => preloader.style.display = 'none', 800);
    }, 500); // Minimum display time
  }
});

// Mobile Menu Toggle
function toggleMobileMenu() {
  const nav = document.getElementById('navLinks');
  const toggle = document.getElementById('mobileNavToggle');
  if (nav) nav.classList.toggle('open');
  if (toggle) toggle.classList.toggle('open');
}

// Scroll Handling
window.addEventListener('scroll', () => {
  // 1. Scroll Progress Bar
  const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrolled = (winScroll / height) * 100;
  const pb = document.getElementById('scroll-progress');
  if (pb) pb.style.width = scrolled + '%';

  // 2. Mobile Menu Auto-close
  const nav = document.getElementById('navLinks');
  const toggle = document.getElementById('mobileNavToggle');
  if (nav && nav.classList.contains('open') && window.scrollY > 20) {
    nav.classList.remove('open');
    if (toggle) toggle.classList.remove('open');
  }
});

// Magnetic Buttons
document.querySelectorAll('.magnetic').forEach(btn => {
  btn.addEventListener('mousemove', e => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = `translate(0px, 0px)`;
  });
});

// ── BOOKING ENGINE INIT ───────────────────────────────────────────────────────
// Load rooms immediately (Step 1 is now Choose Room)
renderRoomsTab();


