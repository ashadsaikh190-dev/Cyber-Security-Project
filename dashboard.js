const supabaseUrl = "https://nianoafaavkiiviffbbt.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pYW5vYWZhYXZraWl2aWZmYmJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MzMzOTksImV4cCI6MjA4NjEwOTM5OX0.2Jdmy5kk1-Kx2-AJZMJwfOPLuHU0XsjAaZXL6ODR9mk"; // keep your key here

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let map;
let markers = []; // to avoid duplicate markers
let latestAlerts = []; // cached latest fetched alerts for client-side filtering

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 5,
    center: { lat: 20.5937, lng: 78.9629 } // India center
  });
}

// Clear old markers
function clearMarkers() {
  markers.forEach(marker => marker.setMap(null));
  markers = [];
}

async function showAlerts(data) {
  const container = document.getElementById("alerts");
  if (!container) return;

  clearMarkers();

  // update stats bar (compute quickly from data without waiting for geocoding)
  const statsBar = document.getElementById('statsBar');
  if (statsBar) {
    const total = data ? data.length : 0;
    const pending = data ? data.filter(d => d.progress === 'PENDING').length : 0;
    const inProgress = data ? data.filter(d => d.progress === 'IN_PROGRESS').length : 0;
    const resolved = data ? data.filter(d => d.progress === 'RESOLVED').length : 0;
    statsBar.innerHTML = `
      <div class="stat"><div class="num">${total}</div><div class="label">Total</div></div>
      <div class="stat"><div class="num">${pending}</div><div class="label">Pending</div></div>
      <div class="stat"><div class="num">${inProgress}</div><div class="label">In Progress</div></div>
      <div class="stat"><div class="num">${resolved}</div><div class="label">Resolved</div></div>
    `;
  }

  // handle empty or missing data gracefully
  if (!data || data.length === 0) {
    container.innerHTML = '<p class="no-alerts">No alerts at the moment.</p>';
    return;
  }

  // fallback geocoding using OpenStreetMap Nominatim (no Google API key required)
  async function getAddress(lat, lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
      const res = await fetch(url);
      console.log('nominatim status', res.status, url);
      if (!res.ok) return 'Address not found';
      const json = await res.json();
      console.log('nominatim', json);
      return json.display_name || 'Address not found';
    } catch (e) {
      console.error('Nominatim failed', e);
      return 'Address not found';
    }
  }

  let output = "";

  // build cards sequentially so we can await address for each (skip geocode if DB has it)
  for (const item of data) {
    let color = "red";
    let label = "🔴 Pending";

    if (item.progress === "IN_PROGRESS") {
      color = "orange";
      label = "🟡 In Progress";
    }

    if (item.progress === "RESOLVED") {
      color = "green";
      label = "🟢 Resolved";
    }

    // prefer stored address column if present
    let addr = item.address && item.address.trim() ? item.address : null;
    let addrSource = null;
    if (addr) {
      addrSource = 'DB';
      console.log('using DB address for', item.id, addr);
    } else {
      // fallback to geocoding (may fail if service blocked)
      addr = await getAddress(item.latitude, item.longitude);
      addrSource = 'Nominatim';
    }

    output += `
      <div class="alert-card" style="border-left:6px solid ${color}; cursor:pointer;" onclick="zoomTo(${item.latitude}, ${item.longitude})">
        <h3>🚨 SOS ALERT</h3>
        <p><b>Status:</b> <span style="color:${color}">${label}</span></p>
        <p>📍 Latitude: ${item.latitude}</p>
        <p>📍 Longitude: ${item.longitude}</p>
        <p>📍 ${addr}</p>
        <p>🕒 ${new Date(item.created_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})}</p>

        <div class="btn-group">
          <button class="btn-progress" onclick="updateProgress('${item.id}','IN_PROGRESS')">
            In Progress
          </button>
          <button class="btn-resolved" onclick="updateProgress('${item.id}','RESOLVED')">
            Resolved
          </button>
        </div>
      </div>
    `;

    const marker = new google.maps.Marker({
      position: { lat: parseFloat(item.latitude), lng: parseFloat(item.longitude) },
      map: map,
      title: "SOS Alert"
    });

    markers.push(marker);

    // if we fetched the address via Nominatim, persist it back to Supabase
    // do this asynchronously so UI doesn't block
    if (addrSource === 'Nominatim' && addr && addr !== 'Address not found') {
      supabaseClient
        .from('alerts')
        .update({ address: addr })
        .eq('id', item.id)
        .then(({ error }) => {
          if (error) console.log('Failed to save address to DB for', item.id, error);
          else console.log('Saved address to DB for', item.id);
        })
        .catch(e => console.log('Error saving address', e));
    }
  }

  container.innerHTML = output;
}

// Load alerts
async function loadAlerts() {
  const container = document.getElementById('alerts');
  const { data, error } = await supabaseClient
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false }); // newest first

  if (error) {
    console.error('Error fetching alerts:', error);
    if (container) {
      container.innerHTML = '<p class="no-alerts">Failed to load alerts (see console)</p>';
    }
    return null;
  }

  console.log('alerts data', data);
  if (data) {
    latestAlerts = data; // cache for filtering
    await showAlerts(data);
  }
  return data;
}

// apply filters from UI to cached `latestAlerts` and re-render
function applyFilters() {
  const q = (document.getElementById('searchInput') && document.getElementById('searchInput').value || '').trim().toLowerCase();
  const status = (document.getElementById('statusFilter') && document.getElementById('statusFilter').value) || 'ALL';

  let filtered = latestAlerts.slice();
  if (status && status !== 'ALL') {
    filtered = filtered.filter(a => (a.progress || '').toUpperCase() === status);
  }

  if (q) {
    filtered = filtered.filter(a => {
      const idStr = (a.id || '').toString().toLowerCase();
      const addr = (a.address || '').toLowerCase();
      const lat = (a.latitude || '').toString().toLowerCase();
      const lng = (a.longitude || '').toString().toLowerCase();
      return idStr.includes(q) || addr.includes(q) || lat.includes(q) || lng.includes(q);
    });
  }

  // render filtered set
  showAlerts(filtered);
}

// wire filter inputs (debounced for search)
function setupFilters() {
  const search = document.getElementById('searchInput');
  const status = document.getElementById('statusFilter');
  const clear = document.getElementById('clearFilters');
  if (!search || !status) return;

  let timer = null;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(applyFilters, 300);
  });
  status.addEventListener('change', applyFilters);
  if (clear) {
    clear.addEventListener('click', () => {
      search.value = '';
      status.value = 'ALL';
      applyFilters();
    });
  }
}


// Update progress (button function)
async function updateProgress(id, newStatus) {
  const { error } = await supabaseClient
    .from("alerts")
    .update({ progress: newStatus })
    .eq("id", id);

  if (error) {
    alert("Update failed");
    console.log(error);
  } else {
    loadAlerts(); // refresh UI
  }
}

// REALTIME updates (INSERT + UPDATE)
supabaseClient
  .channel('alerts-channel')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'alerts' },
    async payload => {
      // whenever something changes, reload and zoom to newest alert
      const data = await loadAlerts();
      if (data && data.length) {
        // order() above ensures newest is first
        zoomTo(data[0].latitude, data[0].longitude);
      }
    }
  )
  .subscribe();

// helper to recenter the map when an alert card is clicked
function zoomTo(lat, lng) {
  if (!map) return;
  map.setCenter({ lat: parseFloat(lat), lng: parseFloat(lng) });
  map.setZoom(15);
}

initMap();
loadAlerts();
setupFilters();