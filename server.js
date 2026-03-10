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

// Bazani yangi accounting ustunlari bilan boyitish
async function initDatabase() {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS loads (
            id SERIAL PRIMARY KEY, 
            driver TEXT, 
            dest TEXT, 
            gross FLOAT DEFAULT 0,
            status TEXT DEFAULT 'Ready',
            lat FLOAT DEFAULT 41.2995,
            lng FLOAT DEFAULT 69.2401
        )`);
        console.log("✅ Dispatch Board bazasi tayyor!");
    } catch (err) { console.error("❌ Baza xatosi:", err.message); }
}
initDatabase();

// Login qismi
app.get('/login', (req, res) => {
    res.send(`<html><body style="background:#f3f4f6; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;"><form action="/login" method="POST" style="background:white; padding:40px; border-radius:8px; box-shadow:0 4px 6px rgba(0,0,0,0.1); width:320px;"><h2 style="text-align:center; margin-bottom:20px; color:#1f2937">Rite Freight Login</h2><input name="username" placeholder="User" style="width:100%; margin-bottom:10px; padding:10px; border:1px solid #ddd; border-radius:4px;"><input name="password" type="password" placeholder="Pass" style="width:100%; margin-bottom:20px; padding:10px; border:1px solid #ddd; border-radius:4px;"><button style="width:100%; padding:10px; background:#2563eb; color:white; border:none; border-radius:4px; cursor:pointer">Sign In</button></form></body></html>`);
});

app.post('/login', (req, res) => {
    if(req.body.username === 'admin' && req.body.password === '1234') {
        req.session.user = 'admin'; res.redirect('/');
    } else { res.send("Xato!"); }
});

// Status va Grossni yangilash API
app.post('/update-load', async (req, res) => {
    const { id, status, gross } = req.body;
    try {
        await pool.query('UPDATE loads SET status = $1, gross = $2 WHERE id = $3', [status, gross, id]);
        io.emit('loadUpdated', { id, status, gross });
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
    </head>
    <body class="bg-gray-100 font-sans">
        <nav class="bg-white border-b p-4 flex justify-between items-center shadow-sm">
            <div class="flex items-center space-x-4">
                <span class="text-blue-600 font-bold text-xl italic">RITE FREIGHT INC</span>
                <div class="bg-gray-200 text-xs px-2 py-1 rounded">TEAM 3</div>
            </div>
            <div class="text-sm font-medium text-gray-600">Dispatch Board</div>
        </nav>

        <div class="flex h-[calc(100vh-64px)]">
            <div class="w-2/3 p-4 overflow-y-auto bg-white">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-bold text-gray-700 uppercase tracking-wider">Status Board</h2>
                    <button onclick="document.getElementById('addModal').classList.toggle('hidden')" class="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600">+ New Load</button>
                </div>

                <table class="w-full text-left border-collapse bg-white">
                    <thead>
                        <tr class="bg-gray-50 border-b text-gray-500 text-xs uppercase">
                            <th class="p-3">Status</th>
                            <th class="p-3">Driver</th>
                            <th class="p-3">Destination</th>
                            <th class="p-3">Gross ($)</th>
                            <th class="p-3">Action</th>
                        </tr>
                    </thead>
                    <tbody id="board-body">
                        \${loads.map(l => \`
                            <tr class="border-b hover:bg-gray-50 text-sm" id="row-\${l.id}">
                                <td class="p-3">
                                    <select onchange="updateLoad(\${l.id}, this.value, document.getElementById('gross-\${l.id}').value)" 
                                            class="p-1 rounded text-xs font-bold \${getStatusColor(l.status)}">
                                        <option \${l.status === 'Ready' ? 'selected' : ''}>Ready</option>
                                        <option \${l.status === 'EnRoute' ? 'selected' : ''}>EnRoute</option>
                                        <option \${l.status === 'Covered' ? 'selected' : ''}>Covered</option>
                                        <option \${l.status === 'Home' ? 'selected' : ''}>Home</option>
                                    </select>
                                </td>
                                <td class="p-3 font-medium text-gray-800">\${l.driver}</td>
                                <td class="p-3 text-gray-600 text-xs font-mono italic">\${l.dest}</td>
                                <td class="p-3">
                                    <input type="number" id="gross-\${l.id}" value="\${l.gross}" 
                                           onblur="updateLoad(\${l.id}, null, this.value)"
                                           class="w-20 border rounded p-1 text-xs">
                                </td>
                                <td class="p-3">
                                    <button class="text-gray-400 hover:text-blue-500">Edit</button>
                                </td>
                            </tr>
                        \`).join('')}
                    </tbody>
                </table>
            </div>

            <div class="w-1/3 border-l relative">
                <div id="map" class="h-full w-full"></div>
                <div class="absolute top-4 left-4 z-[1000] bg-white p-2 rounded shadow text-xs font-bold">LIVE TRACKING</div>
            </div>
        </div>

        <div id="addModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]">
            <div class="bg-white p-6 rounded shadow-lg w-96">
                <h3 class="text-lg font-bold mb-4 text-gray-700">Add New Assignment</h3>
                <form action="/add" method="POST" class="space-y-4">
                    <input name="driver" placeholder="Driver Name" required class="w-full border p-2 rounded">
                    <input name="dest" placeholder="Destination (City, ST)" class="w-full border p-2 rounded">
                    <input name="gross" type="number" placeholder="Gross Amount ($)" class="w-full border p-2 rounded">
                    <div class="flex justify-end space-x-2">
                        <button type="button" onclick="document.getElementById('addModal').classList.add('hidden')" class="px-4 py-2 text-gray-500">Cancel</button>
                        <button class="bg-blue-500 text-white px-4 py-2 rounded">Create</button>
                    </div>
                </form>
            </div>
        </div>

        <script>
            const socket = io();
            const map = L.map("map", {zoomControl:false}).setView([37.0902, -95.7129], 4); // USA View
            L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png").addTo(map);

            const markers = {};
            const initialLoads = \${JSON.stringify(loads)};

            initialLoads.forEach(l => {
                if(l.lat && l.lng) {
                    markers[l.id] = L.circleMarker([l.lat, l.lng], {
                        radius: 7, color: '#3b82f6', fillOpacity: 1
                    }).addTo(map).bindPopup("<b>" + l.driver + "</b>");
                }
            });

            async function updateLoad(id, status, gross) {
                const currentStatus = status || document.querySelector('#row-'+id+' select').value;
                await fetch('/update-load', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({id, status: currentStatus, gross})
                });
            }

            socket.on('loadUpdated', (data) => {
                // Real-time UI updates
            });

            socket.on("driverMoved", (data) => {
                if (markers[data.id]) markers[data.id].setLatLng([data.lat, data.lng]);
            });
        </script>
    </body>
    </html>
    `);
});

// Yordamchi rang funksiyasi
function getStatusColor(s) {
    if(s === 'Ready') return 'bg-emerald-100 text-emerald-700';
    if(s === 'EnRoute') return 'bg-blue-100 text-blue-700';
    if(s === 'Covered') return 'bg-orange-100 text-orange-700';
    return 'bg-gray-100 text-gray-700';
}

app.post('/add', async (req, res) => {
    const { driver, dest, gross } = req.body;
    // USA markazidan boshlash
    await pool.query('INSERT INTO loads (driver, dest, gross, status, lat, lng) VALUES ($1, $2, $3, $4, $5, $6)', 
        [driver, dest, gross || 0, 'Ready', 39.8283, -98.5795]);
    res.redirect('/');
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log("✅ Dispatch Board yondi"));
