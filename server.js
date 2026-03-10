const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const app = express();
const prisma = new PrismaClient();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Baza strukturasini yangilash
try {
  execSync('npx prisma db push --accept-data-loss');
} catch (e) { console.log(e); }

// ASOSIY DASHBOARD
app.get('/', async (req, res) => {
  const drivers = await prisma.driver.findMany({ orderBy: { name: 'asc' } });
  
  const rows = drivers.map(d => `
    <tr class="border-b border-gray-100 hover:bg-gray-50 transition">
      <td class="p-4">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
            ${d.name.charAt(0)}
          </div>
          <span class="font-bold text-slate-700">${d.name}</span>
        </div>
      </td>
      <td class="p-4">
        <select onchange="updateDriver('${d.id}', 'status', this.value)" class="text-xs font-bold uppercase p-1 rounded border-none bg-transparent cursor-pointer focus:ring-2 focus:ring-blue-500 ${d.status === 'AVAILABLE' ? 'text-green-500' : 'text-blue-500'}">
          <option value="AVAILABLE" ${d.status === 'AVAILABLE' ? 'selected' : ''}>AVAILABLE</option>
          <option value="EN_ROUTE" ${d.status === 'EN_ROUTE' ? 'selected' : ''}>EN ROUTE</option>
          <option value="AT_RECEIVER" ${d.status === 'AT_RECEIVER' ? 'selected' : ''}>AT RECEIVER</option>
          <option value="OFF_DUTY" ${d.status === 'OFF_DUTY' ? 'selected' : ''}>OFF DUTY</option>
        </select>
      </td>
      <td class="p-4">
        <input type="text" onblur="updateDriver('${d.id}', 'dest', this.value)" value="${d.dest || ''}" placeholder="Enter City, ST" class="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none text-sm text-gray-500 italic">
      </td>
      <td class="p-4">
        <div class="flex items-center text-blue-600 font-black">
          <span class="mr-1">$</span>
          <input type="number" onblur="updateDriver('${d.id}', 'gross', this.value)" value="${d.gross || 0}" class="w-20 bg-transparent outline-none">
        </div>
      </td>
      <td class="p-4 text-right">
        <button onclick="deleteDriver('${d.id}')" class="text-gray-300 hover:text-red-500 transition">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </button>
      </td>
    </tr>
  `).join('');

  res.send(\`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Rite Freight Pro | Dispatch</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="
