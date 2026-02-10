const supabaseUrl = "https://nianoafaavkiiviffbbt.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pYW5vYWZhYXZraWl2aWZmYmJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MzMzOTksImV4cCI6MjA4NjEwOTM5OX0.2Jdmy5kk1-Kx2-AJZMJwfOPLuHU0XsjAaZXL6ODR9mk";

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let map;

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 5,
    center: { lat: 20.5937, lng: 78.9629 } // India center
  });
}

function showAlerts(data) {
  let output = "";

  data.forEach(alert => {

    // Add marker
    new google.maps.Marker({
      position: { lat: parseFloat(alert.latitude), lng: parseFloat(alert.longitude) },
      map: map,
      title: "SOS Alert"
    });

   output += `
  <div style="border:2px solid red; margin:10px; padding:10px;">
    <h3>🚨 LIVE SOS ALERT</h3>
    <p>Latitude: ${alert.latitude}</p>
    <p>Longitude: ${alert.longitude}</p>
    <p>Time: ${new Date(alert.created_at).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata"
    })}</p>
  </div>
`;
  });

  document.getElementById("alerts").innerHTML = output;
}

// Load existing alerts
async function loadAlerts() {
  const { data, error } = await supabaseClient
    .from('alerts')
    .select('*');

  showAlerts(data);
}

// REALTIME updates
supabaseClient
  .channel('alerts-channel')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'alerts' },
    payload => {
      loadAlerts();
    }
  )
  .subscribe();

initMap();
loadAlerts();