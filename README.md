# Server Administration Academy (Base Structure)

## What’s included
- `index.html` — Academy Home (Tracks, Labs, Knowledge Checks)
- `activity.html` — Lab runner (ticket workflow)
- `assets/` — CSS + JS
- `data/catalog.json` — controls what appears on Home
- `data/labs/dns-dhcp.json` — sample lab content (tickets)

## Run locally
Use a local web server (because JSON is loaded with fetch):
- VS Code: Live Server
- or Python: `python -m http.server 8000`

Open:
- http://localhost:8000/index.html
- http://localhost:8000/activity.html?lab=dns-dhcp
