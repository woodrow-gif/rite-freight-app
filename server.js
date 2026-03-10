const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const app = express();
const prisma = new PrismaClient();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Bazani avtomatik sozlash
try {
    execSync('npx prisma db push --accept-data-loss');
    console.log('✅ Baza tayyor!');
} catch (e) {
    console.log('Baza xatosi:', e.message);
}

app.get('/', async (req, res) => {
    try {
        const drivers = await prisma.driver.findMany({ orderBy: { name: 'asc' } });
        
        let rows = drivers.map(d => `
            <tr class="border-b">
                <td class="p-4 font-bold text-gray-700">${d.name}</td>
                <td class="p-4 text-green-600 font-bold text-xs">${d.status || 'AVAILABLE'}</td>
                <td class="p-4 text-gray-500 italic">${d.dest || '-'}</td>
                <td class="p-4 font-bold text-blue-600">$${d.gross || 0}</td>
                <td class="p-4"><button onclick="del('${d.id}')" class="text-red-500">X</button></td>
            </tr>
        `).join('');

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Rite Freight TMS</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-100 p-8">
            <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border">
                <div class="bg-blue-600 p-6 flex justify-between items-center text-white">
                    <h1 class="text-xl font-black italic uppercase">Rite Freight TMS</h1>
                    <button onclick="document.getElementById('m').style.display='flex'" class="bg-white text-blue-600 px-6 py-2 rounded-lg font-bold text-xs uppercase shadow-md">+ Add Driver</button>
                </div>
                <table class="w-full text-left">
                    <thead class="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-widest font-black">
                        <tr><th class="p-4">Driver</th><th class="p-4">Status</th><th class="p-4">Destination</th><th class="p-4">Gross</th><th class="p-4"></th></tr>
                    </thead>
                    <tbody>${rows || '<tr><td colspan="5" class="p-10 text-center text-gray-300 italic">Hali haydovchilar yoq</td></tr>'}</tbody>
                </table>
            </div>

            <div id="m" style="display:none;" class="fixed inset-0 bg-black/50 items-center justify-center p-4 z-50">
                <div class="bg-white p-8 rounded-2xl w-full max-w-sm shadow-2xl text-center">
                    <h2 class="text-xl font-bold mb-6 uppercase">Yangi haydovchi</h2>
                    <form action="/add" method="POST" class="space-y-4">
                        <input name="name" placeholder="F.I.SH" required class="w-full p-4 bg-gray-100 rounded-xl outline-none font-bold">
                        <button class="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg">Saqlash</button>
                        <button type="button" onclick="document.getElementById('m').style.display='none'" class="text-gray-400 font-bold text-sm mt-4">Bekor qilish</button>
                    </form>
                </div>
            </div>

            <script>
                async function del(id) {
                    if(confirm('Ochirishga ishonchingiz komilmi?')) {
                        await fetch('/del/'+id, {method:'DELETE'});
                        location.reload();
                    }
                }
            </script>
        </body>
        </html>`;

        res.send(html);
    } catch (err) {
        res.status(500).send("Xatolik: " + err.message);
    }
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
app.listen(PORT, () => console.log('🚀 TMS LIVE'));
