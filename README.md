# FoodBridge — Campus Food Rescue Dashboard

A responsive front-end prototype built with **HTML, CSS, and vanilla JavaScript**. FoodBridge helps a campus community share surplus food, record local claims, and demonstrate how the project supports **SDG 2 (Zero Hunger)** and **SDG 12 (Responsible Consumption and Production)**.

## Design direction

- Warm yellow and ivory palette with tomato-coral urgency markers, sage accents, charcoal text, and soft borders/shadows.
- A small animated cartoon food mascot and low-contrast food doodles in the background.
- Four interactive metric cards with hover lift, icon motion, and responsive layout.
- Keyboard focus states and reduced-motion support.

## Features

- Add donations using a validated form.
- Claim available food and record a claimant.
- Search by food, donor, notes, category, or pickup area.
- Filter by food category and listing status.
- Automatic urgency labels for pickups due within one or three hours.
- Local persistence using `localStorage`.
- Impact metrics for active listings, claimed portions, urgent pickups, and community actions.
- SDG 2 and SDG 12 impact snapshot.
- Leaflet map using OpenStreetMap tiles, with marker colors for urgent (coral-red), normal (green), and claimed (neutral) listings.
- Map popups show food title, quantity, category, pickup area/window, claim status, and an action to open the claim form.
- Map markers are regenerated from the same listing state after donations and claims.
- Mobile navigation, empty state, toast messages, and reset-to-demo action.

## Run it

1. Open the folder in VS Code.
2. Run `index.html` with the Live Server extension, or serve the folder with a local web server.
3. Keep an internet connection available for the Leaflet library, OpenStreetMap map tiles, and Google Fonts. If Leaflet cannot load, the page shows a clear map fallback message; donation and claim functionality remains local.

No package installation or paid map API key is required for this prototype.

## Map location accuracy

The initial map is centered on the Chandigarh University area in Gharuan, near Kharar, Punjab. Sample donations use **approximate campus demo points** (such as the campus food court, student centre, hostel pickup zone, and main gate collection zone). These are illustrative locations, not verified collection addresses. New donations without supplied coordinates use clearly labelled approximate campus demo points. Do not treat these markers as real-world pickup directions.

## Important limitations

This is a **front-end student prototype**. `localStorage` only saves data in the current browser and does not sync between people or devices. A claim does not contact a donor, arrange a pickup, verify food safety, or notify a recipient. Impact numbers are calculated from recorded claims and should not be presented as independently verified meals delivered or food waste prevented.

For production deployment, add a backend/database, authentication, donor-recipient messaging, moderation, verified coordinates, and appropriate food-safety and privacy processes. Use OpenStreetMap tiles in accordance with its current usage policy.

