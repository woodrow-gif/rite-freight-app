const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const app = express();
const prisma = new PrismaClient();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Bazani avtomatik tayyorlash
try {
    execSync('npx prisma db push --accept-data-loss');
    console.log('✅ Baza tayyor!');
} catch (e) {
    console.log('Baza xatosi:', e.message);
}

app.get('/', async (req, res) => {
    const drivers = await prisma.driver.findMany({ orderBy: { name: 'asc' } });
    
    let rows = drivers.map(d => `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-4 font-bold text-slate-700">${d.name}</td>
            <td class="p-4 text-xs font-black text-green-600">${d.status || 'AVAILABLE'}</td>
            <td class="p-4 text-slate-500 italic">${d.dest || '-'}</td>
            <td class="p-4 font-bold text-blue-600">$${d.gross || 0}</td>
            <td class="p-4"><button onclick="del('${d.id}')" class="text-red-400 font-bold">X</button></td>
        </tr>
    `).join('');

    // HTML kodini bitta o'zgaruvchiga olamiz (xatolik chiqmasligi uchun)
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Rite Freight TMS</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-100 p-10 font-sans">
        <div class="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div class="bg-slate-900 p-6 flex justify-between items-center">
                <h1 class="text-white text-xl font-black italic tracking-tighter">RITE FREIGHT <span class="text-blue-500">TMS</span></h1>
                <button onclick="document.getElementById('m').style.display='flex'" class="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase">+ New Driver</button>
            </div>
            <table class="w-full text-left">
                <thead class="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-widest font-black">
                    <tr><th class="p-4">Driver</th><th class="p-4">Status</th><th class="p-4">Destination</th><th class="p-4">Gross</th><th class="p-4"></th></tr>
                </thead>
                <tbody>${rows || '<tr><td colspan="5" class="p-10 text-center text-slate-300 italic">No drivers found</td></tr>'}</tbody>
            </table>
        </div>

        <div id="m" style="display:none;" class="fixed inset-0 bg-black/50 items-center justify-center p-4">
            <div class="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl text-center">
                <h2 class="text-xl font-black mb-6 italic uppercase">Add Driver</h2>
                <form action="/add" method="POST" class="space-y-4">
                    <input name="name" placeholder="Full Name" required class="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold">
                    <button class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase shadow-lg shadow-blue-200">Confirm</button>
                    <button type="button" onclick="document.getElementById('m').style.display='none'" class="text-slate-400 font-bold text-sm mt-4">Cancel</button>
                </form>
            </div>
        </div>

        <script>
            async function del(id) {
                if(confirm('Delete?')) {
                    await fetch('/del/'+id, {method:'DELETE'});
                    location.reload();
                }
            }
        </script>
    </body>
    </html>`;

    res.send(html);
});

app.post('/add', async (req, res) => {
    await prisma.driver.create({ data: { name: req.body.name } });
    res.redirect('/');
});

app.delete('/del/:id', async (req, res) => {
    await prisma.driver.delete({ where: { id: req.params.id } });
    res.json({ok: true});
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('TMS LIVE'));
