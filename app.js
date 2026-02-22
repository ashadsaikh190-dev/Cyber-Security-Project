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
  const countdownEl = document.getElementById("countdown"); // still may exist but unused
  const cancelBtn = document.getElementById("cancelBtn");
  const submitBtn = document.getElementById("submitBtn");
  const statusText = document.getElementById("statusText");
  const detailsEl = document.getElementById('details');

  // form fields
  const inputName = document.getElementById('userName');
  const inputPhone = document.getElementById('phoneNumber');
  const inputEmergency = document.getElementById('emergencyContact');
  const inputDestination = document.getElementById('destination');
  const inputMessage = document.getElementById('optionalMessage');
  const inputCurrentLoc = document.getElementById('currentLocation');

  // details are shown after SOS is sent; hide until then
  if (detailsEl) detailsEl.style.display = 'none';

  if (!sosBtn) {
    alert("SOS button not found in HTML");
    return;
  }

  // clear/reset form fields (but keep current location disabled until geolocation)
  function resetForm() {
    if (inputName) inputName.value = '';
    if (inputPhone) inputPhone.value = '';
    if (inputEmergency) inputEmergency.value = '';
    if (inputDestination) inputDestination.value = '';
    if (inputMessage) inputMessage.value = '';
    const currentLoc = document.getElementById('currentLocation');
    if (currentLoc) currentLoc.value = '';
  }

  function resetAll() {
    resetForm();
    if (detailsEl) detailsEl.style.display = 'none';
    if (statusText) statusText.textContent = 'System ready. Stay safe.';
  }

  cancelBtn && cancelBtn.addEventListener('click', () => {
    alert('Form cleared');
    resetForm();
  });

  // submit details separately
  submitBtn && submitBtn.addEventListener('click', () => {
    // gather details and send via email only
    const details = {
      name: inputName ? inputName.value.trim() : '',
      phone: inputPhone ? inputPhone.value.trim() : '',
      emergencyContact: inputEmergency ? inputEmergency.value.trim() : '',
      destination: inputDestination ? inputDestination.value.trim() : '',
      message: inputMessage ? inputMessage.value.trim() : '',
      currentLocation: inputCurrentLoc ? inputCurrentLoc.value : ''
    };
    if (!details.name && !details.phone && !details.emergencyContact && !details.destination && !details.message) {
      alert('Please enter at least one detail before submitting.');
      return;
    }
    emailjs.send("service_uqhlqtv", "template_2xyptyf", details)
      .then(() => {
        alert('Details submitted successfully');
        resetForm();
      })
      .catch(err => {
        console.error('detail submit error', err);
        alert('Failed to submit details');
      });
  });

  sosBtn.addEventListener("click", function () {
    // send SOS immediately when pressed
    alert("SOS button pressed");
    if (statusText) statusText.textContent = 'Sending SOS...';

    sendSOS();
  });



  function sendSOS() {
    if (!navigator.geolocation) {
      alert("Location not supported");
      resetAll();
      return;
    }

    navigator.geolocation.getCurrentPosition(async function (pos) {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const mapLink = `https://www.google.com/maps?q=${lat},${lng}`;
      // show current location in form (lat,lng)
      const currentLoc = document.getElementById('currentLocation');
      if (currentLoc) currentLoc.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

      // try to get a human readable address; prefer simple OpenStreetMap Nominatim
      async function reverseGeocode(lat, lng) {
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
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
      if (!address) address = null;

      // gather details from form
      const details = {
        name: inputName ? inputName.value.trim() : '',
        phone: inputPhone ? inputPhone.value.trim() : '',
        emergencyContact: inputEmergency ? inputEmergency.value.trim() : '',
        destination: inputDestination ? inputDestination.value.trim() : '',
        message: inputMessage ? inputMessage.value.trim() : ''
      };

      // only store the core alert info in the database; additional form
//details may not exist as columns in the `alerts` table and can trigger
//errors, so they are sent via email only.
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
        const msg = error.message || JSON.stringify(error);
        alert("Database error: " + msg);
        console.log("insert error", error);
        resetCountdown();
        return;
      }

      // send email including details
      const emailPayload = {
        latitude: lat,
        longitude: lng,
        location: mapLink,
        time: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        ...details
      };
      emailjs.send("service_uqhlqtv", "template_2xyptyf", emailPayload);

      alert("SOS SENT SUCCESSFULLY");
      if (statusText) statusText.textContent = 'SOS sent';
      // reveal form so user may enter additional details afterwards
      if (detailsEl) detailsEl.style.display = 'block';
    }, function () {
      alert("Location permission denied");
      resetAll();
    });
  }

};