const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const app = express();
const prisma = new PrismaClient();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Baza jadvallarini avtomatik yangilash
try {
    execSync('npx prisma db push --accept-data-loss');
    console.log('✅ Baza yangilandi!');
} catch (e) { console.log(e); }

app.get('/', async (req, res) => {
    const drivers = await prisma.driver.findMany({ orderBy: { name: 'asc' } });
    
    const rows = drivers.map(d => {
        // Statusga qarab rang tanlash
        const statusColor = d.status === 'EN_ROUTE' ? 'bg-blue-100 text-blue-700' : 
                          d.status === 'AT_RECEIVER' ? 'bg-purple-100 text-purple-700' : 
                          'bg-green-100 text-green-700';
        
        return `
        <tr class="border-b border-gray-100 hover:bg-gray-50 transition">
            <td class="p-4">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs">${d.name.charAt(0)}</div>
                    <span class="font-bold text-slate-700">${d.name}</span>
                </div>
            </td>
            <td class="p-4">
                <select onchange="update('${d.id}', 'status', this.value)" class="text-[10px] font-black uppercase px-3 py-1 rounded-full border-none cursor-pointer ${statusColor}">
                    <option value="AVAILABLE" ${d.status === 'AVAILABLE' ? 'selected' : ''}>AVAILABLE</option>
                    <option value="EN_ROUTE" ${d.status === 'EN_ROUTE' ? 'selected' : ''}>EN ROUTE</option>
                    <option value="AT_RECEIVER" ${d.status === 'AT_RECEIVER' ? 'selected' : ''}>AT RECEIVER</option>
                </select>
            </td>
            <td class="p-4">
                <input type="text" onblur="update('${d.id}', 'dest', this.value)" value="${d.dest || ''}" placeholder="City, ST" class="w-full bg-transparent border-none focus:ring-2 focus:ring-blue-500 rounded text-sm text-gray-500 italic outline-none">
            </td>
            <td class="p-4 font-black text-blue-600 text-sm">
                $<input type="number" onblur="update('${d.id}', 'gross', this.value)" value="${d.gross || 0}" class="w-16 bg-transparent outline-none">
            </td>
            <td class="p-4 text-right">
                <button onclick="del('${d.id}')" class="text-gray-300 hover:text-red-500 transition">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"/></svg>
                </button>
            </td>
        </tr>`;
    }).join('');

    res.send(\`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Rite Freight Pro | Dispatch Board</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-[#f8f9fc] font-sans antialiased text-slate-900">
        <div class="flex h-screen">
            <div class="w-64 bg-[#0f172a] text-white p-6 shadow-2xl flex flex-col">
                <div class="flex items-center space-x-3 mb-12">
                    <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-black italic text-xl">RF</div>
                    <div class="leading-none">
                        <span class="block font-black text-lg tracking-tighter italic">RITE FREIGHT</span>
                        <span class="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Carrier TMS</span>
                    </div>
                </div>
                <nav class="flex-1 space-y-1 text-sm font-medium">
                    <a href="/" class="flex items-center space-x-3 p-3 bg-blue-600/10 text-blue-400 rounded-xl border border-blue-600/20 font-bold">
                        <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        <span>Dispatch Board</span>
                    </a>
                    <a href="#" class="flex items-center space-x-3 p-3 text-slate-400 hover:text-white transition"><span>Active Loads</span></a>
                    <a href="#" class="flex items-center space-x-3 p-3 text-slate-400 hover:text-white transition"><span>Fleet Maintenance</span></a>
                    <a href="#" class="flex items-center space-x-3 p-3 text-slate-400 hover:text-white transition"><span>Accounting</span></a>
                </nav>
            </div>

            <div class="flex-1 flex flex-col overflow-hidden">
                <header class="h-20 bg-white border-b border-slate-200 px-8 flex justify-between items-center shadow-sm">
                    <div>
                        <h2 class="text-xl font-black text-slate-800 uppercase italic">Active Dispatch Board</h2>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Division: Team 3 / USA North East</p>
                    </div>
                    <button onclick="document.getElementById('modal').style.display='flex'" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-black text-xs shadow-lg shadow-blue-200 transition uppercase tracking-widest">+ NEW DRIVER</button>
                </header>

                <main class="p-8 overflow-y-auto">
                    <div class="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                        <table class="w-full text-left">
                            <thead class="bg-slate-50/50 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] border-b border-slate-100">
                                <tr><th class="p-6">Driver Name</th><th class="p-6">Status</th><th class="p-6">Destination</th><th class="p-6">Gross Pay</th><th class="p-6"></th></tr>
                            </thead>
                            <tbody class="divide-y divide-slate-50">\${rows || '<tr><td colspan="5" class="p-20 text-center text-slate-300 italic">No drivers active. Click + New Driver to start.</td></tr>'}</tbody>
                        </table>
                    </div>
                </main>
            </div>
        </div>

        <div id="modal" style="display:none;" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl">
                <h3 class="text-2xl font-black mb-8 text-slate-800 italic uppercase">New Assignment</h3>
                <form action="/add" method="POST" class="space-y-6">
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Driver Full Name</label>
                        <input type="text" name="name" required class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition font-bold">
                    </div>
                    <div class="flex space-x-4 pt-4">
                        <button type="button" onclick="document.getElementById('modal').style.display='none'" class="flex-1 py-4 font-black text-slate-300 uppercase text-xs">Cancel</button>
                        <button type="submit" class="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100 uppercase text-xs tracking-widest">Confirm</button>
                    </div>
                </form>
            </div>
        </div>

        <script>
            async function update(id, field, value) {
                await fetch('/update', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({id, [field]: value})
                });
                if(field === 'status') location.reload();
            }
            async function del(id) {
                if(confirm('Are you sure?')) {
                    await fetch('/del/'+id, {method:'DELETE'});
                    location.reload();
                }
            }
        </script>
    </body>
    </html>
    \`);
});

app.post('/add', async (req, res) => {
    await prisma.driver.create({ data: { name: req.body.name } });
    res.redirect('/');
});

app.post('/update', async (req, res) => {
    const { id, status, dest, gross } = req.body;
    const data = {};
    if(status) data.status = status;
    if(dest !== undefined) data.dest = dest;
    if(gross !== undefined) data.gross = parseFloat(gross) || 0;
    await prisma.driver.update({ where: { id }, data });
    res.json({ok: true});
});

app.delete('/del/:id', async (req, res) => {
    await prisma.driver.delete({ where: { id: req.params.id } });
    res.json({ok: true});
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('🚀 TMS PRO LIVE'));
