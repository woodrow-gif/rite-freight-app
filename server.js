const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const app = express();
const prisma = new PrismaClient();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Baza jadvallarini avtomatik sozlash
try {
  execSync('npx prisma db push');
  console.log('✅ Baza tayyor!');
} catch (error) {
  console.error('❌ Baza xatosi:', error);
}

// ASOSIY DASHBOARD (Frontend)
app.get('/', async (req, res) => {
  const drivers = await prisma.driver.findMany();
  const loads = await prisma.load.findMany({ include: { driver: true } });

  let driverRows = drivers.map(d => `
    <tr class="border-b">
      <td class="p-3">${d.name}</td>
      <td class="p-3"><span class="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">${d.status}</span></td>
      <td class="p-3 text-blue-600 font-bold">Available</td>
    </tr>
  `).join('');

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rite Freight TMS</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 font-sans">
      <div class="flex h-screen">
        <div class="w-64 bg-slate-900 text-white p-6">
          <h1 class="text-2xl font-bold mb-10 italic">RITE FREIGHT</h1>
          <nav class="space-y-4">
            <a href="#" class="block py-2 px-4 bg-blue-600 rounded">Dispatch Board</a>
            <a href="#" class="block py-2 px-4 hover:bg-slate-800">Loads</a>
            <a href="#" class="block py-2 px-4 hover:bg-slate-800">Drivers</a>
            <a href="#" class="block py-2 px-4 hover:bg-slate-800">Accounting</a>
          </nav>
        </div>

        <div class="flex-1 flex flex-col overflow-hidden">
          <header class="bg-white shadow-sm p-4 flex justify-between items-center">
            <h2 class="text-xl font-semibold text-gray-800">Active Dispatch Board</h2>
            <button onclick="document.getElementById('modal').style.display='flex'" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-bold shadow-lg">
              + ADD DRIVER
            </button>
          </header>

          <main class="flex-1 overflow-x-hidden overflow-y-auto p-6">
            <div class="bg-white rounded-xl shadow-sm border border-gray-200">
              <table class="w-full text-left border-collapse">
                <thead class="bg-gray-50 text-gray-400 text-xs uppercase font-semibold">
                  <tr>
                    <th class="p-3 border-b">Driver Name</th>
                    <th class="p-3 border-b">Status</th>
                    <th class="p-3 border-b">Action</th>
                  </tr>
                </thead>
                <tbody class="text-gray-600">
                  ${driverRows || '<tr><td colspan="3" class="p-10 text-center italic text-gray-400">Hozircha haydovchilar yo\'q. Iltimos, qo\'shing.</td></tr>'}
                </tbody>
              </table>
            </div>
          </main>
        </div>
      </div>

      <div id="modal" style="display:none;" class="fixed inset-0 bg-black bg-opacity-50 items-center justify-center">
        <div class="bg-white p-8 rounded-2xl w-96 shadow-2xl">
          <h3 class="text-xl font-bold mb-4">Yangi haydovchi qo'shish</h3>
          <form action="/add-driver" method="POST">
            <input type="text" name="name" placeholder="Driver Full Name" class="w-full p-3 border rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 outline-none" required>
            <div class="flex justify-end space-x-3">
              <button type="button" onclick="document.getElementById('modal').style.display='none'" class="px-4 py-2 text-gray-500">Bekor qilish</button>
              <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Saqlash</button>
            </div>
          </form>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Haydovchi qo'shish API
app.post('/add-driver', async (req, res) => {
  const { name } = req.body;
  await prisma.driver.create({
    data: { name: name }
  });
  res.redirect('/');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()
