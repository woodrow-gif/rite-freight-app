const express = require('express');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(session({ 
    secret: 'rite-secret', 
    resave: false, 
    saveUninitialized: true 
}));

// --- BAZA BILAN ALOQA (RENDER UCHUN TO'G'RILANGAN) ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Jadvallarni avtomatik yaratish
async function initDatabase() {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT, password TEXT)`);
        await pool.query(`INSERT INTO users (username, password) SELECT 'admin', '1234' WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin')`);
        await pool.query(`CREATE TABLE IF NOT EXISTS loads (id SERIAL PRIMARY KEY, driver TEXT, dest TEXT, lat FLOAT, lng FLOAT, status TEXT)`);
        console.log("✅ Baza jadvallari va ulanish tayyor!");
    } catch (err) {
        console.error("❌ Baza xatosi:", err.message);
    }
}
initDatabase();

// 1. LOGIN SAHIFASI
app.get('/login', (req, res) => {
    res.send(`<html><body style="background:#0f172a; display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif; margin:0;"><form action="/login" method="POST" style="background:white; padding:40px; border-radius:10px; width:300px;"><h2 style="text-align:center; color:#1e293b">TMS LOGIN</h2><input name="username" placeholder="User" style="display:block; width:100%; margin-bottom:10px; padding:12px; border:1px solid #ddd; border-radius:5px;"><input name="password" type="password" placeholder="Pass" style="display:block; width:100%; margin-bottom:20px; padding:12px; border:1px solid #ddd; border-radius:5px;"><button style="width:100%; padding:12px; background:#2563eb; color:white; border:none; border-radius
