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

    
      const { error } = await supabase.from("alerts").insert([
        {
          latitude: lat,
          longitude: lng,
          status: "SOS TRIGGERED",
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