(() => {
  "use strict";

  const STORAGE_KEY = "foodbridge.v1";
  const GOAL_PORTIONS = 100;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const initialListings = [
    {
      id: "demo-101", title: "Fresh meal boxes", category: "Cooked meals", portions: 20,
      donor: "Neighbourhood Community Kitchen", area: "Campus food court (demo point)", window: "Within 1 hour", mapLocation: { lat: 30.7691, lng: 76.5754, label: "Campus food court · demo point" },
      condition: "Freshly prepared", notes: "Vegetarian meal boxes. Pickup in sealed containers; ask about ingredients before distribution.",
      status: "available", createdAt: Date.now() - 1000 * 60 * 18, claimedBy: "", claimNote: "", demo: true
    },
    {
      id: "demo-102", title: "Bakery surplus packs", category: "Bakery", portions: 12,
      donor: "Corner Oven Bakery", area: "Student centre (demo point)", window: "Within 3 hours", mapLocation: { lat: 30.7704, lng: 76.5732, label: "Student centre · demo point" },
      condition: "Bakery surplus", notes: "Bread rolls and plain buns packed separately. Contains wheat; please transport in clean bags.",
      status: "available", createdAt: Date.now() - 1000 * 60 * 44, claimedBy: "", claimNote: "", demo: true
    },
    {
      id: "demo-103", title: "Seasonal fruit basket", category: "Produce", portions: 16,
      donor: "Green Basket Grocers", area: "Hostel pickup zone (demo point)", window: "Today", mapLocation: { lat: 30.7678, lng: 76.5770, label: "Hostel pickup zone · demo point" },
      condition: "Fresh produce", notes: "Fresh bananas, apples and oranges. Please inspect produce and take reusable crates back.",
      status: "available", createdAt: Date.now() - 1000 * 60 * 95, claimedBy: "", claimNote: "", demo: true
    },
    {
      id: "demo-104", title: "Sealed snack packs", category: "Packaged food", portions: 30,
      donor: "Campus Student Society", area: "Main gate collection zone (demo point)", window: "Tomorrow", mapLocation: { lat: 30.7711, lng: 76.5708, label: "Main gate collection zone · demo point" },
      condition: "Sealed / packaged", notes: "Individually sealed, labelled snack packs. Check printed expiry dates and packaging before distribution.",
      status: "available", createdAt: Date.now() - 1000 * 60 * 130, claimedBy: "", claimNote: "", demo: true
    }
  ];

  const categoryIcons = {
    "Cooked meals": { emoji: "🍱", css: "meals" },
    "Bakery": { emoji: "🥖", css: "bakery" },
    "Produce": { emoji: "🥬", css: "produce" },
    "Packaged food": { emoji: "🥫", css: "packaged" },
    "Other": { emoji: "🍽️", css: "other" }
  };

  let state = loadState();
  let activeView = "overview";
  let toastTimer;
  let foodMap = null;
  let mapMarkers = new Map();
  const fallbackMapPoints = [
    { lat: 30.7691, lng: 76.5754, label: "Campus food court · approximate demo point" },
    { lat: 30.7704, lng: 76.5732, label: "Student centre · approximate demo point" },
    { lat: 30.7678, lng: 76.5770, label: "Hostel pickup zone · approximate demo point" },
    { lat: 30.7711, lng: 76.5708, label: "Main gate collection zone · approximate demo point" },
    { lat: 30.7682, lng: 76.5716, label: "Campus community hub · approximate demo point" }
  ];

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.listings)) {
          return { listings: parsed.listings, activity: Array.isArray(parsed.activity) ? parsed.activity : [] };
        }
      }
    } catch (error) {
      console.warn("FoodBridge local data could not be loaded.", error);
    }
    return { listings: structuredCloneSafe(initialListings), activity: [] };
  }

  function structuredCloneSafe(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      showToast("Could not save locally. Check your browser storage settings.");
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function formatAge(timestamp) {
    const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
    return `${Math.floor(hours / 24)} day${Math.floor(hours / 24) === 1 ? "" : "s"} ago`;
  }

  function isUrgent(listing) {
    return listing.status === "available" && ["Within 1 hour", "Within 3 hours"].includes(listing.window);
  }

  function rescuedPortions() {
    return state.listings.filter(item => item.status === "claimed").reduce((sum, item) => sum + Number(item.portions || 0), 0);
  }

  function activeListings() {
    return state.listings.filter(item => item.status === "available");
  }

  function communityActions() {
    return state.listings.length + state.activity.filter(item => item.type === "claimed").length;
  }

  function renderStats() {
    const active = activeListings();
    const rescued = rescuedPortions();
    $("#statActive").textContent = active.length;
    $("#statRescued").innerHTML = `${rescued} <small>portions</small>`;
    $("#statUrgent").textContent = active.filter(isUrgent).length;
    $("#statActions").textContent = communityActions();
    $("#navListingsCount").textContent = active.length;
    $("#impactPortions").textContent = rescued;
    const progress = Math.min(100, Math.round((rescued / GOAL_PORTIONS) * 100));
    $("#goalProgress").textContent = progress;
    $("#goalProgressBar").style.width = `${progress}%`;
  }

  function getFilteredListings() {
    const search = $("#searchInput").value.trim().toLowerCase();
    const category = $("#categoryFilter").value;
    const status = $("#statusFilter").value;
    return [...state.listings]
      .filter(item => status === "all" || item.status === status)
      .filter(item => category === "all" || item.category === category)
      .filter(item => {
        const searchable = [item.title, item.category, item.donor, item.area, item.notes, item.condition].join(" ").toLowerCase();
        return !search || searchable.includes(search);
      })
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "available" ? -1 : 1;
        return Number(b.createdAt) - Number(a.createdAt);
      });
  }

  function listingCard(item) {
    const icon = categoryIcons[item.category] || categoryIcons.Other;
    const statusLabel = item.status === "claimed" ? "CLAIMED" : (isUrgent(item) ? "URGENT PICKUP" : "AVAILABLE");
    const statusClass = item.status === "claimed" ? "status-claimed" : (isUrgent(item) ? "status-urgent" : "status-available");
    const safeId = escapeHTML(item.id);
    const details = item.notes || `${item.condition || "Food donation"} available for collection.`;
    return `
      <article class="listing-item" data-id="${safeId}">
        <div class="food-art ${icon.css}"><span class="food-emoji" aria-hidden="true">${icon.emoji}</span></div>
        <div class="listing-main">
          <div class="listing-title-row"><div class="listing-title">${escapeHTML(item.title)}</div><span class="status-pill ${statusClass}">${statusLabel}</span></div>
          <div class="listing-meta">
            <span>♧ ${escapeHTML(item.donor)}</span><span>⌖ ${escapeHTML(item.area)}</span><span>◷ ${escapeHTML(item.window)}</span>
          </div>
          <p class="listing-description">${escapeHTML(details)}</p>
          <div class="listing-actions">
            <span class="portion-count">▦ ${Number(item.portions)} portions · ${escapeHTML(item.category)}</span>
            ${item.status === "available"
              ? `<button class="claim-button" data-claim="${safeId}">Claim food ↗</button>`
              : `<button class="details-button" data-claimed-info="${safeId}" disabled>Claimed by ${escapeHTML(item.claimedBy || "community")}</button>`}
            <button class="details-button" data-details="${safeId}">Details</button>
          </div>
        </div>
      </article>`;
  }

  function renderListings() {
    const listings = getFilteredListings();
    $("#listingList").innerHTML = listings.map(listingCard).join("");
    $("#emptyState").classList.toggle("hidden", listings.length > 0);
    $("#listingList").classList.toggle("hidden", listings.length === 0);
    $("#listingSummary").textContent = `Showing ${listings.length} of ${state.listings.length} listings`;
  }

  function render() {
    renderStats();
    renderListings();
    renderMapMarkers();
  }

  function initMap() {
    const mapElement = $("#foodMap");
    if (!mapElement || !window.L) {
      if (mapElement) mapElement.innerHTML = '<div class="map-fallback">The interactive map needs an internet connection to load Leaflet and OpenStreetMap tiles.</div>';
      return;
    }
    foodMap = L.map(mapElement, { scrollWheelZoom: false }).setView([30.7690, 76.5747], 16);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
    }).addTo(foodMap);
    foodMap.on("popupopen", event => {
      const button = event.popup.getElement()?.querySelector("[data-map-claim]");
      if (button) button.addEventListener("click", () => openClaim(button.dataset.mapClaim));
    });
    renderMapMarkers();
    setTimeout(() => foodMap && foodMap.invalidateSize(), 150);
  }

  function markerColour(item) {
    if (item.status === "claimed") return "#969184";
    return isUrgent(item) ? "#e45e49" : "#5e9a61";
  }

  function markerPoint(item, index) {
    if (item.mapLocation && Number.isFinite(Number(item.mapLocation.lat)) && Number.isFinite(Number(item.mapLocation.lng))) {
      return { lat: Number(item.mapLocation.lat), lng: Number(item.mapLocation.lng), label: item.mapLocation.label || "Provided location" };
    }
    return fallbackMapPoints[index % fallbackMapPoints.length];
  }

  function renderMapMarkers() {
    if (!foodMap || !window.L) return;
    mapMarkers.forEach(marker => foodMap.removeLayer(marker));
    mapMarkers.clear();
    state.listings.forEach((item, index) => {
      const point = markerPoint(item, index);
      const colour = markerColour(item);
      const markerIcon = L.divIcon({
        className: "food-marker-wrap",
        html: `<span class="food-marker ${item.status === "claimed" ? "claimed" : isUrgent(item) ? "urgent" : "normal"}" style="--marker-colour:${colour}" aria-hidden="true"><span></span></span>`,
        iconSize: [28, 34], iconAnchor: [14, 31], popupAnchor: [0, -29]
      });
      const marker = L.marker([point.lat, point.lng], { icon: markerIcon, title: `${item.title} — ${item.status}` }).addTo(foodMap);
      const statusText = item.status === "claimed" ? `Claimed by ${escapeHTML(item.claimedBy || "community")}` : isUrgent(item) ? "Urgent pickup" : "Available";
      const statusClass = item.status === "claimed" ? "popup-claimed" : isUrgent(item) ? "popup-urgent" : "popup-normal";
      const claimAction = item.status === "available" ? `<button class="map-claim-button" type="button" data-map-claim="${escapeHTML(item.id)}">Open claim form</button>` : "";
      const pointNote = point.label.toLowerCase().includes("approximate") || point.label.toLowerCase().includes("demo")
        ? `<p><em>${escapeHTML(point.label)} — not a verified pickup address.</em></p>`
        : `<p><em>Location: ${escapeHTML(point.label)}</em></p>`;
      marker.bindPopup(`<div class="map-popup"><h3>${escapeHTML(item.title)}</h3><p><strong>${Number(item.portions)} portions</strong> · ${escapeHTML(item.category)}</p><p>Pickup area: ${escapeHTML(item.area)}</p><p>Pickup window: ${escapeHTML(item.window)}</p><p class="popup-status ${statusClass}">${statusText}</p>${pointNote}${claimAction}</div>`);
      mapMarkers.set(item.id, marker);
    });
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    const firstInput = $("input:not([type=hidden]), select, textarea, button", modal);
    if (firstInput) setTimeout(() => firstInput.focus(), 50);
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add("hidden");
    if ($$(".modal-backdrop:not(.hidden)").length === 0) document.body.style.overflow = "";
  }

  function logActivity(type, listing, detail = "") {
    state.activity.unshift({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type, listingId: listing.id, title: listing.title, portions: Number(listing.portions),
      detail, timestamp: Date.now()
    });
    state.activity = state.activity.slice(0, 100);
  }

  function openClaim(id) {
    const item = state.listings.find(listing => listing.id === id);
    if (!item || item.status !== "available") {
      showToast("This listing is no longer available.");
      render();
      return;
    }
    const icon = categoryIcons[item.category] || categoryIcons.Other;
    $("#claimSummary").innerHTML = `<span class="summary-emoji">${icon.emoji}</span><div><strong>${escapeHTML(item.title)}</strong><span>${Number(item.portions)} portions · ${escapeHTML(item.area)} · ${escapeHTML(item.window)}</span></div>`;
    $("#claimForm").elements.id.value = item.id;
    openModal("claimModal");
  }

  function addDonation(formData) {
    const title = String(formData.get("title") || "").trim();
    const donor = String(formData.get("donor") || "").trim();
    const area = String(formData.get("area") || "").trim();
    const portions = Number(formData.get("portions"));
    if (!title || !donor || !area || !Number.isInteger(portions) || portions < 1 || portions > 5000) {
      showToast("Check the required fields and portion count.");
      return;
    }
    const item = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title, category: formData.get("category"), portions, donor, area,
      window: formData.get("window"), condition: formData.get("condition"),
      notes: String(formData.get("notes") || "").trim(),
      status: "available", createdAt: Date.now(), claimedBy: "", claimNote: "", demo: false,
      mapLocation: null
    };
    state.listings.unshift(item);
    logActivity("listed", item, `Listed by ${donor}`);
    saveState();
    $("#donationForm").reset();
    closeModal("donationModal");
    $("#searchInput").value = "";
    $("#categoryFilter").value = "all";
    $("#statusFilter").value = "available";
    render();
    showToast("Donation published to this browser's local board.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function claimDonation(formData) {
    const id = String(formData.get("id") || "");
    const claimer = String(formData.get("claimer") || "").trim();
    const contact = String(formData.get("contact") || "").trim();
    const item = state.listings.find(listing => listing.id === id);
    if (!item || item.status !== "available" || !claimer) {
      showToast("This listing is unavailable or the name is missing.");
      closeModal("claimModal");
      render();
      return;
    }
    item.status = "claimed";
    item.claimedBy = claimer;
    item.claimNote = contact;
    item.claimedAt = Date.now();
    logActivity("claimed", item, `Claimed by ${claimer}`);
    saveState();
    $("#claimForm").reset();
    closeModal("claimModal");
    $("#statusFilter").value = "available";
    render();
    showToast(`Claim recorded for “${item.title}”. Arrange pickup directly with the donor.`);
  }

  function showDetails(id) {
    const item = state.listings.find(listing => listing.id === id);
    if (!item) return;
    const status = item.status === "claimed" ? `Claimed by ${item.claimedBy || "community"}` : "Available";
    showToast(`${item.title} · ${item.portions} portions · ${status} · Listed ${formatAge(item.createdAt)}.`);
  }

  function switchView(view) {
    activeView = view;
    $$(".nav-link").forEach(button => button.classList.toggle("active", button.dataset.view === view));
    const config = {
      overview: ["Overview", "Make surplus matter.", "A local-first dashboard to connect available food with people who can use it."],
      donations: ["Food listings", "Find food worth sharing.", "Browse, search and filter community food donations."],
      "my-activity": ["My activity", "Every action adds up.", "Your local demo records donation listings and claims made in this browser."],
      impact: ["SDG impact", "Measure what matters.", "Track the prototype's contribution to Zero Hunger and Responsible Consumption."]
    };
    const [crumb, title, subtitle] = config[view] || config.overview;
    $("#breadcrumbCurrent").textContent = crumb;
    $("#pageTitle").innerHTML = view === "overview" ? 'Make surplus <em>matter.</em>' : escapeHTML(title);
    $("#pageSubtitle").textContent = subtitle;

    const listingPanel = $("#listingPanel");
    if (view === "my-activity") {
      renderActivity();
    } else if (view === "impact") {
      showImpactSummary();
    } else {
      listingPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      if (view === "donations") {
        $("#statusFilter").value = "all";
        renderListings();
      }
    }
    $("#sidebar").classList.remove("open");
  }

  function renderActivity() {
    const activities = state.activity;
    if (!activities.length) {
      showToast("No personal actions yet. List a donation or claim an available listing.");
      return;
    }
    const recent = activities.slice(0, 5).map(item => `${item.type === "claimed" ? "Claimed" : "Listed"}: ${item.title} (${item.portions} portions), ${formatAge(item.timestamp)}`).join(" · ");
    showToast(`Recent activity: ${recent}`);
  }

  function showImpactSummary() {
    const claimed = state.listings.filter(item => item.status === "claimed").length;
    const listed = state.listings.length;
    const portions = rescuedPortions();
    showToast(`SDG 2: ${portions} claimed portions tracked. SDG 12: ${claimed} listings claimed; ${listed} total listings recorded. Demo estimates only.`);
  }

  $("#openDonationTop").addEventListener("click", () => openModal("donationModal"));
  $("#openDonationSide").addEventListener("click", () => openModal("donationModal"));
  $("#emptyAddDonation").addEventListener("click", () => openModal("donationModal"));
  $("#donationForm").addEventListener("submit", event => {
    event.preventDefault();
    addDonation(new FormData(event.currentTarget));
  });
  $("#claimForm").addEventListener("submit", event => {
    event.preventDefault();
    claimDonation(new FormData(event.currentTarget));
  });

  $$("[data-close]").forEach(button => button.addEventListener("click", () => closeModal(button.dataset.close)));
  $$(".modal-backdrop").forEach(backdrop => backdrop.addEventListener("click", event => {
    if (event.target === backdrop) closeModal(backdrop.id);
  }));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") $$(".modal-backdrop:not(.hidden)").forEach(modal => closeModal(modal.id));
  });

  $("#searchInput").addEventListener("input", renderListings);
  $("#categoryFilter").addEventListener("change", renderListings);
  $("#statusFilter").addEventListener("change", renderListings);
  $("#listingList").addEventListener("click", event => {
    const claimButton = event.target.closest("[data-claim]");
    const detailsButton = event.target.closest("[data-details]");
    if (claimButton) openClaim(claimButton.dataset.claim);
    if (detailsButton) showDetails(detailsButton.dataset.details);
  });

  $$(".nav-link").forEach(button => button.addEventListener("click", () => switchView(button.dataset.view)));
  $("#viewAllListings").addEventListener("click", () => {
    $("#statusFilter").value = "all";
    switchView("donations");
  });
  $("#goImpact").addEventListener("click", () => switchView("impact"));
  $("#impactDetails").addEventListener("click", () => switchView("impact"));
  $("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));

  $("#resetDemo").addEventListener("click", () => {
    const confirmed = window.confirm("Restore the original sample listings? This removes donations and claims saved in this browser.");
    if (!confirmed) return;
    state = { listings: structuredCloneSafe(initialListings), activity: [] };
    saveState();
    $("#searchInput").value = "";
    $("#categoryFilter").value = "all";
    $("#statusFilter").value = "available";
    render();
    showToast("Sample data restored.");
  });

  render();
  initMap();
})();
