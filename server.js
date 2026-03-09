const express = require('express');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'rite-secret', resave: false, saveUninitialized: true }));

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'dispatch_db',
    password: 'root123',
    port: 5432,
});

app.get('/login', (req, res) => {
    res.send('<html><body style="background:#0f172a; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif; margin:0;"><form action="/login" method="POST" style="background:white; padding:40px; border-radius:10px; width:300px;"><h2 style="text-align:center;">TMS LOGIN</h2><input name="username" placeholder="User" style="display:block; width:100%; margin-bottom:10px; padding:12px; border:1px solid #ddd;"><input name="password" type="password" placeholder="Pass" style="display:block; width:100%; margin-bottom:20px; padding:12px; border:1px solid #ddd;"><button style="width:100%; padding:12px; background:#2563eb; color:white; border:none; border-radius:5px; font-weight:bold; cursor:pointer">LOG IN</button></form></body></html>');
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length > 0) { req.session.user = result.rows[0]; res.redirect('/'); }
        else { res.send("Xato login yoki parol! <a href='/login'>Qaytish</a>"); }
    } catch (e) { res.send(e.message); }
});

app.get('/', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const result = await pool.query('SELECT * FROM loads ORDER BY id DESC');
    const loads = result.rows;
    res.send('<html><head><script src="https://cdn.tailwindcss.com"></script><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script src="/socket.io/socket.io.js"></script></head><body class="bg-slate-950 text-white flex h-screen overflow-hidden"><div class="w-80 bg-slate-900 border-r border-slate-800 flex flex-col p-4"><h1 class="font-black text-blue-500 mb-4 italic text-xl">RITE FREIGHT</h1><form action="/add" method="POST" class="mb-4"><input name="driver" placeholder="Driver" required class="w-full bg-slate-800 p-2 rounded mb-2 border border-slate-700 text-white"><input name="dest" placeholder="Dest" class="w-full bg-slate-800 p-2 rounded mb-2 border border-slate-700 text-white"><button class="w-full bg-blue-600 p-2 rounded font-bold">DISPATCH</button></form><div class="flex-1 overflow-y-auto" id="list"></div></div><div id="map" class="flex-1"></div><script>const socket = io(); const map = L.map("map", {zoomControl:false}).setView([41.2995, 69.2401], 12); L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png").addTo(map); const markers = {}; const initialLoads = ' + JSON.stringify(loads) + '; initialLoads.forEach(l => { if(l.lat && l.lng) markers[l.id] = L.marker([l.lat, l.lng]).addTo(map).bindPopup(l.driver); }); socket.on("driverMoved", (data) => { if (markers[data.id]) markers[data.id].setLatLng([data.lat, data.lng]); });</script></body></html>');
});

app.post('/add', async (req, res) => {
    const { driver, dest } = req.body;
    await pool.query('INSERT INTO loads (driver, dest, lat, lng, status) VALUES ($1, $2, 41.2995, 69.2401, $3)', [driver, dest, 'Ready']);
    res.redirect('/');
});

setInterval(async () => {
    const result = await pool.query("SELECT * FROM loads WHERE driver LIKE '%Akmaljon%'");
    if (result.rows.length > 0) {
        const d = result.rows[0];
        const nLat = parseFloat(d.lat) + (Math.random() - 0.5) * 0.002;
        const nLng = parseFloat(d.lng) + (Math.random() - 0.5) * 0.002;
        await pool.query('UPDATE loads SET lat = $1, lng = $2 WHERE id = $3', [nLat, nLng, d.id]);
        io.emit('driverMoved', { id: d.id, lat: nLat, lng: nLng });
    }
}, 3000);

server.listen(3000, () => console.log("System Ready: http://localhost:3000"));