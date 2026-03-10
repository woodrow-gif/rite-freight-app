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

// Baza tayyorlash
async function initDatabase() {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS loads (
            id SERIAL PRIMARY KEY, 
            driver TEXT, 
            dest TEXT, 
            status TEXT DEFAULT 'Ready',
            gross FLOAT DEFAULT 0
        )`);
    } catch (err) { console.error(err); }
}
initDatabase();

app.get('/login', (req, res) => {
    res.send(`<html><body style="background:#f3f4f6;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;"><form action="/login" method="POST" style="background:white;padding:40px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.1);width:320px;"><h2 style="text-align:center;color:#1e293b;margin-bottom:24px;">RITE TMS LOGIN</h2><input name="username" placeholder="Username" style="width:100%;margin-bottom:12px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;"><input name="password" type="password" placeholder="Password" style="width:100%;margin-bottom:24px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;"><button style="width:100%;padding:12px;background:#2563eb;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Login</button></form></body></html>`);
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

    // HTML shabloni xatosiz bo'lishi uchun alohida o'zgaruvchiga olamiz
    const rows = loads.map(l => `
        <tr class="border-b border-gray-100 hover:bg-gray-50 transition">
            <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-full text-xs font-bold uppercase ${l.status === 'Ready' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}">
                    ${l.status}
                </span>
            </td>
            <td class="px-6 py-4 font-semibold text-gray-700">${l.driver}</td>
            <td class="px-6 py-4 text-gray-500 italic">${l.dest}</td>
            <td class="px-6 py-4 text-blue-600 font-bold">$${l.gross}</td>
            <td class="px-6 py-4">
                <button class="text-gray-400 hover:text-blue-600 mr-3">Edit</button>
                <button class="text-gray-400 hover:text-red-600">Delete</button>
            </td>
        </tr>
    `).join('');

    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <script src="https://cdn.tailwindcss.com"></script>
        <title>Rite Freight Dispatch Board</title>
    </head>
    <body class="bg-gray-50 font-sans antialiased text-gray-900">
        <nav class="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
            <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xl italic">RF</div>
                <h1 class="text-xl font-bold tracking-tight text-gray-800">RITE FREIGHT <span class="text-blue-600">TMS</span></h1>
            </div>
            <div class="flex items-center space-x-4">
                <span class="text-sm text-gray-500">Dispatch Division: <b>TEAM 3</b></span>
                <button onclick="document.getElementById('modal').style.display='flex'" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold text-sm shadow-lg shadow-blue-200 transition">+ NEW ASSIGNMENT</button>
            </div>
        </nav>

        <main class="p-8 max-w-7xl mx-auto">
            <div class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div class="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <h2 class="font-bold text-gray-700 text-lg uppercase tracking-wider">Status Board</h2>
                    <div class="text-xs text-gray-400">Total Active Drivers: ${loads.length}</div>
                </div>
                <table class="w-full text-left">
                    <thead class="bg-gray-50 text-gray-400 text-xs uppercase tracking-widest">
                        <tr>
                            <th class="px-6 py-4">Status</th>
                            <th class="px-6 py-4">Driver</th>
                            <th class="px-6 py-4">Destination</th>
                            <th class="px-6 py-4">Gross</th>
                            <th class="px-6 py-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        </main>

        <div id="modal" style="display:none;" class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
                <h3 class="text-xl font-bold mb-6">Create New Load</h3>
                <form action="/add" method="POST" class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-2">Driver Name</label>
                        <input name="driver" required class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-2">Destination</label>
                        <input name="dest" placeholder="City, State" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-2">Gross Amount ($)</label>
                        <input name="gross" type="number" step="0.01" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3">
                    </div>
                    <div class="flex space-x-3 pt-4">
                        <button type="button" onclick="document.getElementById('modal').style.display='none'" class="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50">Cancel</button>
                        <button type="submit" class="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700">Add Load</button>
                    </div>
                </form>
            </div>
        </div>
    </body>
    </html>
    `);
});

app.post('/add', async (req, res) => {
    const { driver, dest, gross } = req.body;
    await pool.query('INSERT INTO loads (driver, dest, gross) VALUES ($1, $2, $3)', [driver, dest, gross || 0]);
    res.redirect('/');
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log("✅ Board Live"));
