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

async function initDatabase() {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS loads (
            id SERIAL PRIMARY KEY, 
            driver TEXT NOT NULL, 
            dest TEXT DEFAULT 'No Destination', 
            status TEXT DEFAULT 'Ready',
            team TEXT DEFAULT 'Unassigned'
        )`);
        console.log("✅ Baza tayyor!");
    } catch (err) { console.error(err); }
}
initDatabase();

app.get('/login', (req, res) => {
    res.send('<html><body style="background:#f3f4f6;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;"><form action="/login" method="POST" style="background:white;padding:40px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.1);width:320px;"><h2>RITE TMS LOGIN</h2><input name="username" placeholder="User" style="width:100%;margin-bottom:10px;padding:12px;border:1px solid #ddd;"><input name="password" type="password" placeholder="Pass" style="width:100%;margin-bottom:24px;padding:12px;border:1px solid #ddd;"><button style="width:100%;padding:12px;background:#2563eb;color:white;border:none;border-radius:8px;cursor:pointer;">Login</button></form></body></html>');
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

    let rows = "";
    loads.forEach(l => {
        rows += `<tr class="border-b hover:bg-gray-50 text-sm">
            <td class="p-4 text-green-600 font-bold uppercase">${l.status}</td>
            <td class="p-4 font-bold text-gray-800">${l.driver}</td>
            <td class="p-4 text-gray-500 italic">${l.dest}</td>
            <td class="p-4 font-semibold text-blue-600">${l.team}</td>
            <td class="p-4"><button onclick="del(${l.id})" class="text-red-500 font-bold">X</button></td>
        </tr>`;
    });

    res.send(`<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-100 p-8">
        <div class="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border">
            <div class="p-6 bg-blue-600 text-white flex justify-between items-center">
                <h1 class="text-xl font-black italic uppercase">Rite Freight TMS</h1>
                <button onclick="document.getElementById('modal').style.display='flex'" class="bg-white text-blue-600 px-6 py-2 rounded-lg font-bold">+ NEW ASSIGNMENT</button>
            </div>
            <table class="w-full text-left">
                <thead class="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-widest">
                    <tr><th class="p-4">Status</th><th class="p-4">Driver</th><th class="p-4">Destination</th><th class="p-4">Team</th><th class="p-4">Action</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        <div id="modal" style="display:none;" class="fixed inset-0 bg-black/50 items-center justify-center p-4 z-50">
            <div class="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl">
                <h3 class="text-xl font-bold mb-6">Add New Driver</h3>
                <form action="/add" method="POST" class="space-y-4">
                    <input name="driver" required placeholder="Driver Name" class="w-full border p-3 rounded-xl outline-none">
                    <input name="dest" placeholder="Initial Destination" class="w-full border p-3 rounded-xl outline-none">
                    <select name="team" class="w-full border p-3 rounded-xl outline-none">
                        <option value="TEAM 1">TEAM 1</option><option value="TEAM 2">TEAM 2</option><option value="TEAM 3" selected>TEAM 3</option>
                    </select>
                    <div class="flex space-x-3 pt-4">
                        <button type="button" onclick="document.getElementById('modal').style.display='none'" class="flex-1 font-bold text-gray-400">Cancel</button>
                        <button class="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">Assign Driver</button>
                    </div>
                </form>
            </div>
        </div>
        <script>async function del(id) { if(confirm("O'chirilsinmi?")) { await fetch('/delete/'+id, {method:'DELETE'}); window.location.reload(); } }</script>
    </body></html>`);
});

app.post('/add', async (req, res) => {
    const { driver, dest, team } = req.body;
    await pool.query('INSERT INTO loads (driver, dest, team) VALUES ($1, $2, $3)', [driver, dest, team]);
    res.redirect('/');
});

app.delete('/delete/:id', async (req, res) => {
    await pool.query('DELETE FROM loads WHERE id = $1', [req.params.id]);
    res.json({ success: true });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log("🚀 Server Live"));
