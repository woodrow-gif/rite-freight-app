const express = require('express');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ 
    secret: 'rite-secret-key-2026', 
    resave: false, 
    saveUninitialized: true 
}));

// --- DATABASE CONNECTION ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Database Initialization
async function initDatabase() {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS loads (
            id SERIAL PRIMARY KEY, 
            driver TEXT, 
            dest TEXT DEFAULT '', 
            status TEXT DEFAULT 'READY',
            gross FLOAT DEFAULT 0,
            team TEXT DEFAULT 'TEAM 3',
            lat FLOAT DEFAULT 39.82,
            lng FLOAT DEFAULT -98.57,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log("✅ Database and Tables are ready!");
    } catch (err) {
        console.error("❌ Database Error:", err.message);
    }
}
initDatabase();

// --- ROUTES ---

// Login
app.get('/login', (req, res) => {
    res.send(`<html><body style="background:#f3f4f6;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;"><form action="/login" method="POST" style="background:white;padding:40px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.1);width:320px;"><h2 style="text-align:center;color:#1e293b;margin-bottom:24px;font-weight:bold;">RITE TMS LOGIN</h2><input name="username" placeholder="Username" style="width:100%;margin-bottom:12px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;"><input name="password" type="password" placeholder="Password" style="width:100%;margin-bottom:24px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;"><button style="width:100%;padding:12px;background:#2563eb;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Sign In</button></form></body></html>`);
});

app.post('/login', (req, res) => {
    if(req.body.username === 'admin' && req.body.password === '1234') {
        req.session.user = 'admin'; res.redirect('/');
    } else { res.send("Invalid Credentials! <a href='/login'>Try again</a>"); }
});

// Update Driver Data API (Inline Edit uchun)
app.post('/update-driver', async (req, res) => {
    const { id, dest, status, team, gross } = req.body;
    try {
        await pool.query('UPDATE loads SET dest = $1, status = $2, team = $3, gross = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5', 
        [dest, status, team, gross, id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Main Dashboard
app.get('/', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const result = await pool.query('SELECT * FROM loads ORDER BY id DESC');
    const loads = result.rows;

    const rows = loads.map(l => `
        <tr class="border-b border-gray-100 hover:bg-gray-50 transition text-sm">
            <td class="px-6 py-4">
                <select onchange="save(${l.id})" id="status-${l.id}" class="font-bold text-[10px] p-1 rounded uppercase ${l.status === 'READY' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}">
                    <option ${l.status === 'READY' ? 'selected' : ''}>READY</option>
                    <option ${l.status === 'EN ROUTE' ? 'selected' : ''}>EN ROUTE</option>
                    <option ${l.status === 'COVERED' ? 'selected' : ''}>COVERED</option>
                    <option ${l.status === 'HOME' ? 'selected' : ''}>HOME</option>
                </select>
            </td>
            <td class="px-6 py-4 font-bold text-slate-700">${l.driver}</td>
            <td class="px-6 py-4">
                <input type="text" id="dest-${l.id}" onblur="save(${l.id})" value="${l.dest || ''}" class="bg-transparent border-b border-transparent hover:border-gray-300 outline-none w-full italic text-gray-500 transition focus:border-blue-500">
            </td>
            <td class="px-6 py-4 text-blue-600 font-bold">$${l.gross || 0}</td>
            <td class="px-6 py-4">
                <select onchange="save(${l.id})" id="team-${l.id}" class="text-xs font-medium bg-gray-50 border rounded p-1">
                    <option ${l.team === 'TEAM 1' ? 'selected' : ''}>TEAM 1</option>
                    <option ${l.team === 'TEAM 2' ? 'selected' : ''}>TEAM 2</option>
                    <option ${l.team === 'TEAM 3' ? 'selected' : ''}>TEAM 3</option>
                </select>
            </td>
        </tr>
    `).join('');

    res.send(\`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <script src="https://cdn.tailwindcss.com"></script>
        <title>Rite Freight | Dispatch Board</title>
    </head>
    <body class="bg-[#f8f9fc] font-sans">
        <nav class="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
            <div class="flex items-center space-x-4">
                <h1 class="font-black text-blue-600 text-2xl italic tracking-tighter uppercase">Rite Freight <span class="text-slate-800">TMS</span></h1>
            </div>
            <div class="flex space-x-4">
                <div class="bg-slate-100 p-1 rounded-lg flex text-[10px] font-bold">
                    <button class="px-4 py-2 bg-white rounded shadow-sm text-blue-600">DISPATCH</button>
                    <button class="px-4 py-2 text-slate-400">ACCOUNTING</button>
                </div>
                <button onclick="document.getElementById('modal').style.display='flex'" class="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:shadow-lg transition">+ NEW LOAD</button>
            </div>
        </nav>

        <main class="p-8 max-w-7xl mx-auto">
            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="p-6 border-b flex justify-between items-center bg-white">
                    <h2 class="font-bold text-slate-500 uppercase tracking-widest text-[11px]">Active Dispatch Board</h2>
                </div>
                <table class="w-full text-left">
                    <thead class="bg-gray-50 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                        <tr>
                            <th class="px-6 py-4">Status</th>
                            <th class="px-6 py-4">Driver</th>
                            <th class="px-6 py-4">Destination</th>
                            <th class="px-6 py-4">Gross ($)</th>
                            <th class="px-6 py-4">Division</th>
                        </tr>
                    </thead>
                    <tbody>\${rows}</tbody>
                </table>
            </div>
        </main>

        <div id="modal" style="display:none;" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
                <h3 class="text-xl font-bold mb-6 text-slate-800">Assign New Assignment</h3>
                <form action="/add" method="POST" class="space-y-4">
                    <input name="driver" required placeholder="Driver Name" class="w-full border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition">
                    <input name="dest" placeholder="Destination (City, ST)" class="w-full border border-slate-200 p-3 rounded-xl outline-none">
                    <input name="gross" type="number" step="0.01" placeholder="Gross Amount ($)" class="w-full border border-slate-200 p-3 rounded-xl outline-none">
                    <select name="team" class="w-full border border-slate-200 p-3 rounded-xl outline-none bg-white">
                        <option>TEAM 1</option><option>TEAM 2</option><option selected>TEAM 3</option>
                    </select>
                    <div class="flex space-x-3 pt-4">
                        <button type="button" onclick="document.getElementById('modal').style.display='none'" class="flex-1 font-bold text-slate-400">Cancel</button>
                        <button type="submit" class="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-100">Confirm Load</button>
                    </div>
                </form>
            </div>
        </div>

        <script>
            async function save(id) {
                const data = {
                    id: id,
                    status: document.getElementById('status-' + id).value,
                    dest: document.getElementById('dest-' + id).value,
                    gross: document.getElementById('gross-' + id).value || 0,
                    team: document.getElementById('team-' + id).value
                };
                await fetch('/update-driver', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                });
            }
        </script>
    </body>
    </html>
    \`);
});

app.post('/add', async (req, res) => {
    const { driver, dest, gross, team } = req.body;
    await pool.query('INSERT INTO loads (driver, dest, gross, team) VALUES ($1, $2, $3, $4)', 
    [driver, dest, gross || 0, team]);
    res.redirect('/');
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log("🚀 RITE TMS IS LIVE ON PORT " + PORT));
