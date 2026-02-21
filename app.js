window.onload = function () {

  
  if (!window.supabase) {
    alert("Supabase not loaded");
    return;
  }

  const supabaseUrl = "https://nianoafaavkiiviffbbt.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pYW5vYWZhYXZraWl2aWZmYmJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MzMzOTksImV4cCI6MjA4NjEwOTM5OX0.2Jdmy5kk1-Kx2-AJZMJwfOPLuHU0XsjAaZXL6ODR9mk";

  const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

  
  emailjs.init("4Ve-rgKVSpX9aopUq");

  const sosBtn = document.getElementById("sosBtn");

  if (!sosBtn) {
    alert("SOS button not found in HTML");
    return;
  }

  sosBtn.addEventListener("click", function () {

    alert("SOS button pressed");

    if (!navigator.geolocation) {
      alert("Location not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(async function (pos) {

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const mapLink = `https://www.google.com/maps?q=${lat},${lng}`;

    
    // try to get a human readable address; prefer simple OpenStreetMap Nominatim
    async function reverseGeocode(lat, lng) {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
        // browsers forbid setting the User-Agent header; make a plain GET and log response
        const res = await fetch(url);
        console.log('nominatim status', res.status, url);
        if (!res.ok) return null;
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          console.log('nominatim json', json);
          return json.display_name || null;
        } catch (e) {
          console.log('nominatim parse failed', e, text);
          return null;
        }
      } catch (e) {
        console.error('Reverse geocode failed', e);
        return null;
      }
    }

    let address = await reverseGeocode(lat, lng);
    // store null instead of empty string so DB shows missing value clearly
    if (!address) address = null;

    const { error } = await supabase.from("alerts").insert([
      {
        latitude: lat,
        longitude: lng,
        address: address,
        progress: "PENDING",
        created_at: new Date().toISOString()
      }
    ]);

      if (error) {
        alert("Database error");
        console.log(error);
        return;
      }

      
      emailjs.send("service_uqhlqtv", "template_2xyptyf", {
        latitude: lat,
        longitude: lng,
        location: mapLink,
        time: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      });

      alert("SOS SENT SUCCESSFULLY");

    }, function () {
      alert("Location permission denied");
    });

  });

};