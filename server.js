const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const app = express();
const prisma = new PrismaClient();

// Avtomatik bazani yangilash (Migration)
try {
  console.log('🔄 Bazani tekshirish va yangilash...');
  execSync('npx prisma db push'); 
  console.log('✅ Baza jadvallari tayyor!');
} catch (error) {
  console.error('❌ Baza yangilashda xato:', error);
}

app.get('/', async (req, res) => {
  res.send('<h1>Rite Freight TMS - Server is Live!</h1><p>Baza muvaffaqiyatli ulandi.</p>');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server http://localhost:${PORT} portida ishga tushdi`);
});
