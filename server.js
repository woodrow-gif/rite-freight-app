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

async function initDatabase() {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS loads (
            id SERIAL PRIMARY KEY, 
            driver TEXT, 
            dest TEXT, 
            gross FLOAT DEFAULT 0,
            status TEXT DEFAULT 'Ready',
            lat FLOAT DEFAULT 39.82,
            lng FLOAT DEFAULT -98.57
        )`);
        console.log("✅ TMS Baza tayyor!");
    } catch (err) { console.error("❌ Baza xatosi:", err.message); }
}
initDatabase();

app.get('/login', (req, res) => {
    res.send('<html><body style="background:#0f172a; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;"><form action="/login" method="POST" style="background:white; padding:40px; border-radius:8px; width:300px;"><h2>TMS Login</h2><input name="username" placeholder="User" style="width:100%; margin-bottom:10px; padding:10px;"><input name="password" type="password" placeholder="Pass" style="width:100%; margin-bottom:20px; padding:10px;"><button style="width:100%; padding:10px; background:#2563eb; color:white; border:none; cursor:pointer">In</button></form></body></html>');
});

app.post('/login', (req, res) => {
    if(req.body.username === 'admin' && req.body.password === '1234') {
        req.session.user = 'admin'; res.redirect('/');
    } else { res.send("Xato!"); }
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
            #map { height: 100vh; width: 100%; }
            .driver-card { cursor: pointer; transition: 0.2s; }
            .driver-card:hover { background: #1e293b; }
        </style>
    </head>
    <body class="bg-slate-950 text-white flex overflow-hidden">
        
        <div class="w-96 bg-slate-900 border-r border-slate-800 flex flex-col h-screen">
            <div class="p-6 border-b border-slate-800">
                <h1 class="text-xl font-black text-blue-500 italic mb-4">RITE TMS</h1>
                <form action="/add" method="POST" class="space-y-2">
                    <input name="driver" placeholder="Driver Name" required class="w-full bg-slate-800 p-2 rounded text-sm">
                    <input name="dest" placeholder="Destination (e.g. Chicago, IL)" class="w-full bg-slate-800 p-2 rounded text-sm">
                    <button class="w-full bg-blue-600 p-2 rounded font-bold text-sm">ADD ASSIGNMENT</button>
                </form>
            </div>

            <div class="flex-1 overflow-y-auto p-4 space-y-3">
                \${loads.map(l => \`
                    <div onclick="focusDriver(\${l.lat}, \${l.lng}, '\${l.driver}')" class="driver-card bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <div class="flex justify-between items-start">
                            <div>
                                <h3 class="font-bold text-blue-400">\${l.driver}</h3>
                                <p class="text-xs text-slate-400">To: \${l.dest}</p>
                            </div>
                            <span class="text-[10px] px-2 py-1 bg-green-900 text-green-300 rounded font-bold uppercase">\${l.status}</span>
                        </div>
                    </div>
                \`).join('')}
            </div>
        </div>

        <div id="map"></div>

        <script>
            const socket = io();
            const map = L.map("map", {zoomControl:false}).setView([37.09, -95.71], 4);
            L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png").addTo(map);

            const markers = {};
            const initialLoads = \${JSON.stringify(loads)};

            initialLoads.forEach(l => {
                const icon = L.divIcon({
                    className: 'custom-div-icon',
                    html: "<div style='background: #3b82f6; width:12px; height:12px; border-radius:50%; border:2px solid white;'></div>",
                    iconSize: [12, 12]
                });
                markers[l.id] = L.marker([l.lat, l.lng], {icon: icon}).addTo(map).bindPopup("<b>" + l.driver + "</b>");
            });

            function focusDriver(lat, lng, name) {
                map.flyTo([lat, lng], 8, { duration: 1.5 });
            }

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
    await pool.query('INSERT INTO loads (driver, dest, lat, lng) VALUES ($1, $2, 39.82, -98.57)', [driver, dest]);
    res.redirect('/');
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log("✅ TMS Live"));
