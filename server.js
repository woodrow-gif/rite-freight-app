const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const app = express();
const prisma = new PrismaClient();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Baza jadvallarini avtomatik sozlash (Migration)
try {
  console.log('🔄 Bazani tekshirish...');
  execSync('npx prisma db push --accept-data-loss');
  console.log('✅ Baza jadvallari tayyor!');
} catch (error) {
  console.error('❌ Baza xatosi:', error.message);
}

// ASOSIY DASHBOARD
app.get('/', async (req, res) => {
  try {
    const drivers = await prisma.driver.findMany({ orderBy: { name: 'asc' } });
    
    let rows = drivers.map(d => {
      const statusColor = d.status === 'EN_ROUTE' ? 'bg-blue-100 text-blue-700' : 
                          d.status === 'AT_RECEIVER' ? 'bg-purple-100 text-purple-700' : 
                          'bg-green-100 text-green-700';
      return `
        <tr class="border-b border-gray-100 hover:bg-gray-50 transition">
          <td class="p-4 font-bold text-slate-700">${d.name}</td>
          <td class="p-4">
            <select onchange="update('${d.id}', 'status', this.value)" class="text-[10px] font-black uppercase px-3 py-1 rounded-full border-none cursor-pointer ${statusColor}">
              <option value="AVAILABLE" ${d.status === 'AVAILABLE' ? 'selected' : ''}>AVAILABLE</option>
              <option value="EN_ROUTE" ${d.status === 'EN_ROUTE' ? 'selected' : ''}>EN ROUTE</option>
              <option value="AT_RECEIVER" ${d.status === 'AT_RECEIVER' ? 'selected' : ''}>AT RECEIVER</option>
            </select>
          </td>
          <td class="p-4 italic text-sm text-gray-500">
            <input type="text" onblur="update('${d.id}', 'dest', this.value)" value="${d.dest || ''}" placeholder="City, ST" class="bg-transparent border-none outline-none w-full">
          </td>
          <td class="p-4 font-black text-blue-600">$<input type="number" onblur="update('${d.id}', 'gross', this.value)" value="${d.gross || 0}" class="w-20 bg-transparent outline-none border-none"></td>
          <td class="p-4 text-right">
            <button onclick="del('${d.id}')" class="text-red-400 hover:text-red-600 font-bold">X</button>
          </td>
        </tr>`;
    }).join('');

    // HTML shabloni
    const html = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Rite Freight Pro | Dispatch</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-50 font-sans">
      <div class="flex h-screen">
        <div class="w-64 bg-slate-900 text-white p-6 shadow-xl">
          <h1 class="text-2xl font-black italic mb-10 tracking-tighter">RITE FREIGHT</h1>
          <nav class="space-y-4 text-sm font-bold opacity-80">
            <a href="/" class="block text-blue-400">Dispatch Board</a>
            <a href="#" class="block hover:text-white">Active Loads</a>
            <a href="#" class="block hover:text-white">Fleet Management</a>
            <a href="#" class="block hover:text-white">Financials</a>
          </nav>
        </div>
        <div class="flex-1 flex flex-col overflow-hidden">
          <header class="bg-white border-b p-6 flex justify-between items-center shadow-sm">
            <h2 class="text-xl font-black text-slate-800 uppercase italic">Active Dispatch Board</h2>
            <button onclick="document.getElementById('modal').style.display='flex'" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-black text-xs transition">+ NEW DRIVER</button>
          </header>
          <main class="p-8 overflow-auto">
            <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <table class="w-full text-left">
                <thead class="bg-slate-50 text-[10px] text-slate-400 font-black uppercase tracking-widest border-b">
                  <tr><th class="p-6">Driver</th><th class="p-6">Status</th><th class="p-6">Destination</th><th class="p-6">Gross</th><th class="p-6"></th></tr>
                </thead>
                <tbody class="divide-y divide-slate-100">${rows || '<tr><td colspan="5" class="p-10 text-center text-slate-300">No active drivers</td></tr>'}</tbody>
              </table>
            </div>
          </main>
        </div>
      </div>
      <div id="modal" style="display:none;" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center">
        <div class="bg-white p-10 rounded-[2.5rem] w-96 shadow-2xl">
          <h3 class="text-2xl font-black mb-6 italic uppercase">Add Driver</h3>
          <form action="/add" method="POST" class="space-y-4">
            <input type="text" name="name" required placeholder="Full Name" class="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold">
            <button type="submit" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg">CONFIRM</button>
            <button type="button" onclick="document.getElementById('modal').style.display='none'" class="w-full text-slate-300 font-bold py-2 text-xs">CANCEL</button>
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
          if(confirm('Delete this driver?')) {
            await fetch('/del/'+id, {method:'DELETE'});
            location.reload();
          }
        }
      </script>
    </body>
    </html>`;

    res.send(html);
  } catch (error) {
    res.status(500).send("Server Error: " + error.message);
  }
});

// APIs
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
app.listen(PORT, () => console.log('🚀 TMS LIVE'));
