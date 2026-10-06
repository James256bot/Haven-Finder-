// HavenFinder Frontend Logic
const API_URL = 'http://127.0.0.1:8000/api/v1';

// ─── Auth Helpers ──────────────────────────
function getToken() { return localStorage.getItem('accessToken'); }
function isLoggedIn() { return !!getToken(); }

function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = 'login.html';
}

// ─── API Client ────────────────────────────
async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Request failed');
    return data;
}

// ─── Toast ─────────────────────────────────
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.background = type === 'error' ? '#ef4444' : '#10b981';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ─── Load Listings on Homepage ─────────────
async function loadListings() {
    const grid = document.getElementById('listingsGrid');
    if (!grid) return;
    
    try {
        const data = await apiFetch('/listings');
        const listings = data.data || [];
        
        document.getElementById('listingCount').textContent = listings.length;
        
        if (listings.length === 0) {
            grid.innerHTML = '<p style="text-align:center;grid-column:1/-1;color:#64748b;">No listings yet. Create one!</p>';
            return;
        }
        
        grid.innerHTML = listings.map(l => `
            <div class="listing-card" onclick="viewListing('${l.id}')">
                <div class="listing-image">🏠</div>
                <div class="listing-body">
                    <h3 class="listing-title">${escapeHtml(l.title)}</h3>
                    <p class="listing-price">$${Number(l.price).toLocaleString()}</p>
                    <div class="listing-details">
                        ${l.bedrooms ? `<span>🛏️ ${l.bedrooms} bed</span>` : ''}
                        ${l.bathrooms ? `<span>🛁 ${l.bathrooms} bath</span>` : ''}
                        ${l.square_feet ? `<span>📐 ${l.square_feet} sqft</span>` : ''}
                    </div>
                    ${l.city ? `<span class="listing-badge">📍 ${l.city}</span>` : ''}
                    <span class="listing-badge">${l.type || 'property'}</span>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Load listings:', err);
        grid.innerHTML = '<p style="text-align:center;color:#ef4444;">Failed to load listings. Is the API running?</p>';
    }
}

// ─── Hero Search ───────────────────────────
function heroSearch() {
    const query = document.getElementById('heroSearchInput')?.value || '';
    window.location.href = `search.html?q=${encodeURIComponent(query)}`;
}

// ─── Escape HTML ───────────────────────────
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ─── Init ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Update nav based on auth
    if (isLoggedIn()) {
        document.getElementById('loginLink')?.style.setProperty('display', 'none');
        document.getElementById('registerLink')?.style.setProperty('display', 'none');
        document.getElementById('logoutBtn')?.style.setProperty('display', 'inline-block');
    }
    
    loadListings();
});
