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
            driver TEXT, 
            dest TEXT DEFAULT '', 
            status TEXT DEFAULT 'READY',
            gross FLOAT DEFAULT 0,
            team TEXT DEFAULT 'TEAM 3'
        )`);
    } catch (err) { console.error(err); }
}
initDatabase();

app.get('/login', (req, res) => {
    res.send('<html><body style="background:#f3f4f6;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;"><form action="/login" method="POST" style="background:white;padding:40px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.1);width:320px;"><h2>RITE TMS</h2><input name="username" placeholder="Username" style="width:100%;margin-bottom:12px;padding:12px;border:1px solid #ddd;"><input name="password" type="password" placeholder="Password" style="width:100%;margin-bottom:24px;padding:12px;border:1px solid #ddd;"><button style="width:100%;padding:12px;background:#2563eb;color:white;border:none;border-radius:8px;cursor:pointer;">Login</button></form></body></html>');
});

app.post('/login', (req, res) => {
    if(req.body.username === 'admin' && req.body.password === '1234') {
        req.session.user = 'admin'; res.redirect('/');
    } else { res.send("Xato!"); }
});

app.get('/', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    try {
        const result = await pool.query('SELECT * FROM loads ORDER BY id DESC');
        const loads = result.rows;
        
        let rowsHtml = '';
        loads.forEach(l => {
            rowsHtml += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding:12px;">${l.status}</td>
                    <td style="padding:12px; font-weight:bold;">${l.driver}</td>
                    <td style="padding:12px; color:gray italic;">${l.dest}</td>
                    <td style="padding:12px;">${l.team}</td>
                </tr>`;
        });

        res.send(`
        <html>
        <head><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-gray-100 font-sans p-8">
            <div class="max-w-5xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                <div class="p-6 bg-blue-600 text-white flex justify-between">
                    <h1 class="text-xl font-bold italic">RITE FREIGHT TMS</h1>
                    <button onclick="document.getElementById('modal').style.display='flex'" class="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold">+ NEW</button>
                </div>
                <table class="w-full text-left">
                    <thead class="bg-gray-50 text-xs text-gray-400 uppercase">
                        <tr><th class="p-4">Status</th><th class="p-4">Driver</th><th class="p-4">Destination</th><th class="p-4">Team</th></tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>

            <div id="modal" style="display:none;" class="fixed inset-0 bg-black/50 items-center justify-center p-4">
                <div class="bg-white p-8 rounded-2xl w-96">
                    <h3 class="font-bold mb-4">Add Driver</h3>
                    <form action="/add" method="POST" class="space-y-4">
                        <input name="driver" required placeholder="Driver Name" class="w-full border p-2 rounded">
                        <input name="dest" placeholder="Destination" class="w-full border p-2 rounded">
                        <button class="w-full bg-blue-600 text-white p-2 rounded font-bold">Save</button>
                    </form>
                </div>
            </div>
        </body>
        </html>`);
    } catch (e) { res.status(500).send("Database Error: " + e.message); }
});

app.post('/add', async (req, res) => {
    const { driver, dest } = req.body;
    await pool.query('INSERT INTO loads (driver, dest) VALUES ($1, $2)', [driver, dest]);
    res.redirect('/');
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log("✅ TMS Live"));
