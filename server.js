const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const app = express();
const prisma = new PrismaClient();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Baza jadvallarini avtomatik sozlash (Migration)
try {
  console.log('🔄 Bazani tekshirish va sinxronizatsiya qilish...');
  execSync('npx prisma db push');
  console.log('✅ Baza jadvallari tayyor!');
} catch (error) {
  console.error('❌ Baza xatosi:', error.message);
}

// ASOSIY DASHBOARD
app.get('/', async (req, res) => {
  try {
    const drivers = await prisma.driver.findMany();
    
    // Jadval qatorlarini yaratish
    let driverRows = drivers.map(d => `
      <tr class="border-b border-gray-100 hover:bg-gray-50 transition">
        <td class="p-4 font-semibold text-gray-700">${d.name}</td>
        <td class="p-4">
          <span class="px-3 py-1 rounded-full text-xs font-bold uppercase ${d.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}">
            ${d.status}
          </span>
        </td>
        <td class="p-4">
          <button class="text-blue-600 hover:underline font-medium">Assign Load</button>
        </td>
      </tr>
    `).join('');

    if (drivers.length === 0) {
      driverRows = '<tr><td colspan="3" class="p-10 text-center italic text-gray-400">Hozircha haydovchilar yo\'q.</td></tr>';
    }

    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Rite Freight TMS | Dispatch Board</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-[#f8f9fc] font-sans antialiased text-gray-900">
      <div class="flex h-screen">
        <div class="w-64 bg-slate-900 text-white p-6 shadow-xl">
          <div class="flex items-center space-x-3 mb-10">
            <div class="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold italic">RF</div>
            <h1 class="text-xl font-black tracking-tighter italic">RITE FREIGHT</h1>
          </div>
          <nav class="space-y-2 text-sm font-medium">
            <a href="/" class="flex items-center p-3 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/20">Dispatch Board</a>
            <a href="#" class="flex items-center p-3 text-slate-400 hover:text-white transition">Loads Management</a>
            <a href="#" class="flex items-center p-3 text-slate-400 hover:text-white transition">Fleet Tracking</a>
            <a href="#" class="flex items-center p-3 text-slate-400 hover:text-white transition">Financials</a>
          </nav>
        </div>

        <div class="flex-1 flex flex-col">
          <header class="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm">
            <h2 class="text-lg font-bold text-slate-800 uppercase tracking-tight">Active Dispatch Board</h2>
            <button onclick="document.getElementById('modal').style.display='flex'" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold text-sm transition shadow-lg shadow-blue-200">
              + NEW DRIVER
            </button>
          </header>

          <main class="p-8 overflow-y-auto">
            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <table class="w-full text-left">
                <thead class="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-widest font-black">
                  <tr>
                    <th class="p-4 border-b">Driver Name</th>
                    <th class="p-4 border-b">Current Status</th>
                    <th class="p-4 border-b">Operations</th>
                  </tr>
                </thead>
                <tbody>${driverRows}</tbody>
              </table>
            </div>
          </main>
        </div>
      </div>

      <div id="modal" style="display:none;" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm items-center justify-center p-4 z-50">
        <div class="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl">
          <h3 class="text-xl font-bold mb-6 text-slate-800 uppercase italic">Add New Driver</h3>
          <form action="/add-driver" method="POST" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase mb-2">Driver Full Name</label>
              <input type="text" name="name" required class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition">
            </div>
            <div class="flex justify-end space-x-3 pt-4">
              <button type="button" onclick="document.getElementById('modal').style.display='none'" class="px-6 py-3 font-bold text-gray-400">Cancel</button>
              <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-100 transition">Save Driver</button>
            </div>
          </form>
        </div>
      </div>
    </body>
    </html>
    `);
  } catch (error) {
    res.status(500).send("Xatolik yuz berdi: " + error.message);
  }
});

// Haydovchi qo'shish API
app.post('/add-driver', async (req, res) => {
  const { name } = req.body;
  try {
    await prisma.driver.create({ data: { name: name } });
    res.redirect('/');
  } catch (error) {
    res.status(500).send("Haydovchini saqlashda xato: " + error.message);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 TMS Live on port " + PORT);
});
