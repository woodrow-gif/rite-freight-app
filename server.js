const express = require('express');
const session = require('express-session');
const http = require('http');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ secret: 'rite-secret', resave: false, saveUninitialized: true }));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Bazani yangilash
async function initDatabase() {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS loads (
            id SERIAL PRIMARY KEY, 
            driver TEXT, 
            dest TEXT DEFAULT 'No Destination', 
            status TEXT DEFAULT 'READY',
            gross FLOAT DEFAULT 0,
            team TEXT DEFAULT 'TEAM 3',
            created_at DATE DEFAULT CURRENT_DATE
        )`);
    } catch (err) { console.error(err); }
}
initDatabase();

app.get('/login', (req, res) => {
    res.send('<html><body style="background:#f3f4f6;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;"><form action="/login" method="POST" style="background:white;padding:40px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.1);width:320px;"><h2 style="text-align:center;color:#1e293b;margin-bottom:24px;">RITE TMS LOGIN</h2><input name="username" placeholder="Username" style="width:100%;margin-bottom:12px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;"><input name="password" type="password" placeholder="Password" style="width:100%;margin-bottom:24px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;"><button style="width:100%;padding:12px;background:#2563eb;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Login</button></form></body></html>');
});

app.post('/login', (req, res) => {
    if(req.body.username === 'admin' && req.body.password === '1234') {
        req.session.user = 'admin'; res.redirect('/');
    } else { res.send("Xato!"); }
});

// UPDATE API
app.post('/update-driver', async (req, res) => {
    const { id, dest, status, team } = req.body;
    try {
        await pool.query('UPDATE loads SET dest = $1, status = $2, team = $3 WHERE id = $4', [dest, status, team, id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const result = await pool.query('SELECT * FROM loads ORDER BY created_at DESC, id DESC');
    const loads = result.rows;

    const rows = loads.map(l => `
        <tr class="border-b border-gray-100 hover:bg-gray-50 transition text-sm">
            <td class="px-6 py-4">
                <select onchange="updateRow(${l.id})" id="status-${l.id}" class="px-2 py-1 rounded font-bold text-[10px] uppercase ${l.status === 'READY' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}">
                    <option value="READY" ${l.status === 'READY' ? 'selected' : ''}>READY</option>
                    <option value="EN ROUTE" ${l.status === 'EN ROUTE' ? 'selected' : ''}>EN ROUTE</option>
                    <option value="COVERED" ${l.status === 'COVERED' ? 'selected' : ''}>COVERED</option>
                </select>
            </td>
            <td class="px-6 py-4 font-semibold text-gray-700">${l.driver}</td>
            <td class="px-6 py-4">
                <input type="text" onblur="updateRow(${l.id})" id="dest-${l.id}" value="${l.dest || ''}" class="bg-transparent border-b border-dotted border-gray-300 focus:border-blue-500 outline-none italic w-full text-gray-500">
            </td>
            <td class="px-6 py-4">
                <select onchange="updateRow(${l.id})" id="team-${l.id}" class="text-xs bg-gray-100 p-1 rounded font-medium">
                    <option value="TEAM 1" ${l.team === 'TEAM 1' ? 'selected' : ''}>TEAM 1</option>
                    <option value="TEAM 2" ${l.team === 'TEAM 2' ? 'selected' : ''}>TEAM 2</option>
                    <option value="TEAM 3" ${l.team === 'TEAM 3' ? 'selected' : ''}>TEAM 3</option>
                </select>
            </td>
            <td class="px-6 py-4 text-xs text-gray-400 font-mono">${new Date(l.created_at).toLocaleDateString()}</td>
        </tr>
    `).join('');

    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8"><script src="https://cdn.tailwindcss.com"></script>
        <title>Rite TMS Professional</title>
    </head>
    <body class="bg-[#f8f9fc] font-sans antialiased text-gray-900">
        <nav class="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-10">
            <div class="flex items-center space-x-6">
                <h1 class="text-xl font-bold tracking-tight text-gray-800 uppercase italic">Rite Freight <span class="text-blue-600">TMS</span></h1>
                <div class="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                    <button class="px-4 py-1.5 text-xs font-bold rounded-md bg-white shadow-sm">BOARD</button>
                    <button class="px-4 py-1.5 text-xs font-bold text-gray-500">ACCOUNTING</button>
                </div>
            </div>
            <button onclick="document.getElementById('modal').style.display='flex'" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold text-sm">+ ADD DRIVER</button>
        </nav>

        <main class="p-8 max-w-7xl mx-auto">
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                    <h2 class="font-bold text-slate-700 uppercase tracking-widest text-sm">Status Board</h2>
                </div>
                <table class="w-full text-left">
                    <thead class="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-widest">
                        <tr>
                            <th class="px-6 py-4">Status</th>
                            <th class="px-6 py-4">Driver</th>
                            <th class="px-6 py-4">Destination</th>
                            <th class="px-6 py-4">Division</th>
                            <th class="px-6 py-4">Date Added</th>
                        </tr>
                    </thead>
                    <tbody>\${rows}</tbody>
                </table>
            </div>
        </main>

        <div id="modal" style="display:none;" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
                <h3 class="text-xl font-bold mb-6">Assign New Driver</h3>
                <form action="/add" method="POST" class="space-y-4">
                    <input name="driver" required placeholder="Driver Name" class="w-full bg-gray-50 border p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                    <input name="dest" placeholder="Initial Destination" class="w-full bg-gray-50 border p-3 rounded-xl outline-none">
                    <select name="team" class="w-full bg-gray-50 border p-3 rounded-xl outline-none">
                        <option>TEAM 1</option><option>TEAM 2</option><option selected>TEAM 3</option>
                    </select>
                    <div class="flex space-x-3 pt-4">
                        <button type="button" onclick="document.getElementById('modal').style.display='none'" class="flex-1 px-4 py-3 font-bold text-gray-400">Cancel</button>
                        <button type="submit" class="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100">Confirm</button>
                    </div>
                </form>
            </div>
        </div>

        <script>
            async function updateRow(id) {
                const status = document.getElementById('status-' + id).value;
                const dest = document.getElementById('dest-' + id).value;
                const team = document.getElementById('team-' + id).value;

                await fetch('/update-driver', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({id, status, dest, team})
                });
                // Rangni yangilash
                const sel = document.getElementById('status-' + id);
                sel.className = 'px-2 py-1 rounded font-bold text-[10px] uppercase ' + (status === 'READY' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700');
            }
        </script>
    </body>
    </html>
    `);
});

app.post('/add', async (req, res) => {
    const { driver, dest, team } = req.body;
    await pool.query('INSERT INTO loads (driver, dest, team) VALUES ($1, $2, $3)', [driver, dest, team]);
    res.redirect('/');
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log("✅ TMS Professional Live"));
