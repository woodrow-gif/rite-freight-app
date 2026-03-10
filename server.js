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

// Bazani to'g'ri ustunlar bilan yangilash
async function initDatabase() {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS loads (
            id SERIAL PRIMARY KEY, 
            driver TEXT, 
            dest TEXT DEFAULT '', 
            status TEXT DEFAULT 'READY',
            gross FLOAT DEFAULT 0,
            team TEXT DEFAULT 'TEAM 3',
            date_added DATE DEFAULT CURRENT_DATE
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

// Yangilash API
app.post('/update-driver', async (req, res) => {
    const { id, dest, status, team, gross } = req.body;
    try {
        await pool.query('UPDATE loads SET dest = $1, status = $2, team = $3, gross = $4 WHERE id = $5', 
        [dest, status, team, gross, id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const result = await pool.query('SELECT * FROM loads ORDER BY id DESC');
    const loads = result.rows;

    const rows = loads.map(l => `
        <tr class="border-b border-gray-100 hover:bg-gray-50 text-sm">
            <td class="px-6 py-4">
                <select onchange="save(${l.id})" id="status-${l.id}" class="font-bold text-[10px] p-1 rounded ${l.status === 'READY' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}">
                    <option ${l.status === 'READY' ? 'selected' : ''}>READY</option>
                    <option ${l.status === 'EN ROUTE' ? 'selected' : ''}>EN ROUTE</option>
                    <option ${l.status === 'COVERED' ? 'selected' : ''}>COVERED</option>
                </select>
            </td>
            <td class="px-6 py-4 font-semibold text-gray-700">${l.driver || 'Unknown'}</td>
            <td class="px-6 py-4">
                <input type="text" id="dest-${l.id}" onblur="save(${l.id})" value="${l.dest || ''}" class="bg-transparent border-b border-gray-200 outline-none w-full italic text-gray-500">
            </td>
            <td class="px-6 py-4">
                <input type="number" id="gross-${l.id}" onblur="save(${l.id})" value="${l.gross || 0}" class="w-20 bg-gray-50 border p-1 rounded text-blue-600 font-bold">
            </td>
            <td class="px-6 py-4">
                <select onchange="save(${l.id})" id="team-${l.id}" class="text-xs text-gray-500 bg-white border rounded">
                    <option ${l.team === 'TEAM 1' ? 'selected' : ''}>TEAM 1</option>
                    <option ${l.team === 'TEAM 2' ? 'selected' : ''}>TEAM 2</option>
                    <option ${l.team === 'TEAM 3' ? 'selected' : ''}>TEAM 3</option>
                </select>
            </td>
        </tr>
    `).join('');

    res.send(\`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8"><script src="https://cdn.tailwindcss.com"></script>
        <title>Rite TMS Pro</title>
    </head>
    <body class="bg-[#f8f9fc]">
        <nav class="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm sticky top-0 z-50">
            <div class="flex items-center space-x-4">
                <h1 class="font-black text-blue-600 text-xl italic uppercase tracking-tighter">Rite Freight <span class="text-gray-800">TMS</span></h1>
            </div>
            <button onclick="document.getElementById('modal').style.display='flex'" class="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition">+ NEW ASSIGNMENT</button>
        </nav>

        <main class="p-8 max-w-7xl mx-auto">
            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="p-6 border-b flex justify-between items-center">
                    <h2 class="font-bold text-gray-700 uppercase tracking-widest text-xs">Dispatch Board</h2>
                </div>
                <table class="w-full text-left">
                    <thead class="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-widest font-bold">
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

        <div id="modal" style="display:none;" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
                <h3 class="text-xl font-bold mb-6">Assign New Load</h3>
                <form action="/add" method="POST" class="space-y-4">
                    <input name="driver" required placeholder="Driver Name" class="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                    <input name="dest" placeholder="Destination" class="w-full border p-3 rounded-xl outline-none">
                    <input name="gross" type="number" placeholder="Gross Amount ($)" class="w-full border p-3 rounded-xl outline-none">
                    <select name="team" class="w-full border p-3 rounded-xl outline-none">
                        <option>TEAM 1</option><option>TEAM 2</option><option selected>TEAM 3</option>
                    </select>
                    <div class="flex space-x-3 pt-4">
                        <button type="button" onclick="document.getElementById('modal').style.display='none'" class="flex-1 font-bold text-gray-400">Cancel</button>
                        <button type="submit" class="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">Confirm</button>
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
                    gross: document.getElementById('gross-' + id).value,
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
server.listen(PORT, () => console.log("✅ TMS Pro Live"));
