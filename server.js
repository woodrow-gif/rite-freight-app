const express = require('express');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ secret: 'rite-secret', resave: false, saveUninitialized: true }));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Baza jadvallarini yangilash (status ustunini qo'shish bilan)
async function initDatabase() {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS loads (
            id SERIAL PRIMARY KEY, 
            driver TEXT, 
            dest TEXT, 
            lat FLOAT, 
            lng FLOAT, 
            status TEXT DEFAULT 'Ready'
        )`);
        console.log("✅ Baza statuslar bilan tayyor!");
    } catch (err) { console.error("❌ Baza xatosi:", err.message); }
}
initDatabase();

app.get('/login', (req, res) => {
    res.send(`<html><body style="background:#0f172a; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif; margin:0;"><form action="/login" method="POST" style="background:white; padding:40px; border-radius:10px; width:300px;"><h2 style="text-align:center; color:#1e293b">TMS LOGIN</h2><input name="username" placeholder="User" style="display:block; width:100%; margin-bottom:10px; padding:12px; border:1px solid #ddd; border-radius:5px;"><input name="password" type="password" placeholder="Pass" style="display:block; width:100%; margin-bottom:20px; padding:12px; border:1px solid #ddd; border-radius:5px;"><button style="width:100%; padding:12px; background:#2563eb; color:white; border:none; border-radius:5px; font-weight:bold; cursor:pointer">LOG IN</button></form></body></html>`);
});

app.post('/login', (req, res) => {
    if(req.body.username === 'admin' && req.body.password === '1234') {
        req.session.user = 'admin'; res.redirect('/');
    } else { res.send("Xato!"); }
});

// Statusni yangilash uchun API
app.post('/update-status', async (req, res) => {
    const { id, status } = req.body;
    try {
        await pool.query('UPDATE loads SET status = $1 WHERE id = $2', [status, id]);
        io.emit('statusUpdated', { id, status });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const result = await pool.query('SELECT * FROM loads ORDER BY id DESC');
    const loads = result.rows;

    res.send(`
    <html>
    <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script src="/socket.io/socket.io.js"></script>
        <style>
            .status-btn { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer; border: none; margin: 2px; }
            .Ready { background: #22c55e; color: white; }
            .EnRoute { background: #3b82f6; color: white; }
            .Covered { background: #eab308; color: black; }
            .Resting { background: #64748b; color: white; }
            .Home { background: #ef4444; color: white; }
        </style>
    </head>
    <body class="bg-slate-950 text-white flex h-screen overflow-hidden">
        <div class="w-80 bg-slate-900 border-r border-slate-800 flex flex-col p-4">
            <h1 class="font-black text-blue-500 italic text-xl mb-4 text-center border-b border-slate-700 pb-2">RITE TMS</h1>
            
            <form action="/add" method="POST" class="space-y-2 mb-6">
                <input name="driver" placeholder="Driver Name" required class="w-full bg-slate-800 p-2 rounded border border-slate-700">
                <input name="dest" placeholder="Destination" class="w-full bg-slate-800 p-2 rounded border border-slate-700">
                <button class="w-full bg-blue-600 p-2 rounded font-bold">ADD DRIVER</button>
            </form>

            <div class="flex-1 overflow-y-auto space-y-2" id="driver-list">
                \${loads.map(l => \`
                    <div id="card-\${l.id}" class="bg-slate-800 p-3 rounded border-l-4 \${l.status === 'Ready' ? 'border-green-500' : 'border-blue-500'}">
                        <div class="flex justify-between font-bold text-sm">
                            <span>\${l.driver}</span>
                            <span class="text-xs opacity-70" id="stat-text-\${l.id}">\${l.status}</span>
                        </div>
                        <div class="mt-2 flex flex-wrap">
                            <button onclick="updateStatus(\${l.id}, 'Ready')" class="status-btn Ready">Ready</button>
                            <button onclick="updateStatus(\${l.id}, 'EnRoute')" class="status-btn EnRoute">EnRoute</button>
                            <button onclick="updateStatus(\${l.id}, 'Covered')" class="status-btn Covered">Covered</button>
                            <button onclick="updateStatus(\${l.id}, 'Home')" class="status-btn Home">Home</button>
                        </div>
                    </div>
                \`).join('')}
            </div>
        </div>

        <div id="map" class="flex-1"></div>

        <script>
            const socket = io();
            const map = L.map("map", {zoomControl:false}).setView([41.2995, 69.2401], 12);
            L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png").addTo(map);

            const markers = {};
            const initialLoads = \${JSON.stringify(loads)};

            initialLoads.forEach(l => {
                if(l.lat && l.lng) {
                    markers[l.id] = L.circleMarker([l.lat, l.lng], {
                        radius: 8,
                        color: l.status === 'Ready' ? '#22c55e' : '#3b82f6',
                        fillOpacity: 1
                    }).addTo(map).bindPopup(\`<b>\${l.driver}</b><br>Status: \${l.status}\`);
                }
            });

            function updateStatus(id, newStatus) {
                fetch('/update-status', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({id, status: newStatus})
                });
            }

            socket.on('statusUpdated', (data) => {
                const card = document.getElementById('card-' + data.id);
                const text = document.getElementById('stat-text-' + data.id);
                if(text) text.innerText = data.status;
                if(markers[data.id]) {
                    markers[data.id].setPopupContent('<b>Driver</b><br>Status: ' + data.status);
                    markers[data.id].setStyle({color: data.status === 'Ready' ? '#22c55e' : '#3b82f6'});
                }
            });

            socket.on("driverMoved", (data) => {
                if (markers[data.id]) markers[data.id].setLatLng([data.lat, data.lng]);
            });
        </script>
    </body>
    </html>
    `);
});

app.post('/add', async (req, res) => {
    const { driver, dest } = req.body;
    await pool.query('INSERT INTO loads (driver, dest, lat, lng, status) VALUES ($1, $2, 41.2995, 69.2401, $3)', [driver, dest, 'Ready']);
    res.redirect('/');
});

setInterval(async () => {
    try {
        const result = await pool.query("SELECT * FROM loads WHERE status = 'EnRoute'");
        result.rows.forEach(async (d) => {
            const nLat = parseFloat(d.lat) + (Math.random() - 0.5) * 0.002;
            const nLng = parseFloat(d.lng) + (Math.random() - 0.5) * 0.002;
            await pool.query('UPDATE loads SET lat = $1, lng = $2 WHERE id = $3', [nLat, nLng, d.id]);
            io.emit('driverMoved', { id: d.id, lat: nLat, lng: nLng });
        });
    } catch (e) {}
}, 4000);

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log("✅ Server yondi"));
