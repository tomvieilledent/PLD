const express = require('express');
const { Pool } = require('pg');
const { createClient } = require('redis');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.POSTGRES_DB || 'gamenight',
  user: process.env.POSTGRES_USER || 'gamenight',
  password: process.env.POSTGRES_PASSWORD || 'gamenight_dev'
});

let redisClient = null;
let cacheOnline = false;

async function connectCache() {
  try {
    redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'cache',
        port: Number(process.env.REDIS_PORT || 6379),
        connectTimeout: 1500,
        // Redis est un cache optionnel : une indisponibilite ne doit pas bloquer le demarrage de l API.
        reconnectStrategy: () => false
      }
    });
    redisClient.on('error', () => { cacheOnline = false; });
    await redisClient.connect();
    await redisClient.ping();
    cacheOnline = true;
    console.log('[cache] Redis ready');
  } catch (err) {
    cacheOnline = false;
    console.warn('[cache] Redis unavailable, database fallback enabled');
  }
}

async function assertDatabaseReady() {
  console.log(`[db] Connecting to ${process.env.DB_HOST || 'db'}:${process.env.DB_PORT || 5432}...`);
  const client = await pool.connect();
  try { await client.query('SELECT 1'); }
  finally { client.release(); }
  console.log('[db] PostgreSQL ready');
}

app.get('/health', (_req,res)=>res.json({ok:true}));
app.get('/api/status', async (_req,res)=>{
  let database = false;
  try { await pool.query('SELECT 1'); database = true; } catch (_) {}
  let cache = false;
  if (redisClient && cacheOnline) { try { await redisClient.ping(); cache = true; } catch (_) {} }
  res.json({api:true,database,cache,service:'game-night-api'});
});

app.get('/api/games', async (_req,res,next)=>{
  try {
    if (redisClient && cacheOnline) {
      const cached = await redisClient.get('games:all');
      if (cached) return res.json({source:'redis',games:JSON.parse(cached)});
    }
    const { rows } = await pool.query('SELECT id,title,genre,players,rating,image FROM games ORDER BY id');
    if (redisClient && cacheOnline) await redisClient.setEx('games:all',30,JSON.stringify(rows));
    res.json({source:'database',games:rows});
  } catch (err) { next(err); }
});

app.use((err,_req,res,_next)=>{
  console.error('[api]',err.message);
  res.status(500).json({error:'service_unavailable',message:'La plateforme ne peut pas charger les jeux.'});
});

(async()=>{
  try {
    await assertDatabaseReady();
    await connectCache();
    app.listen(PORT,'0.0.0.0',()=>console.log(`[api] listening on ${PORT}`));
  } catch (err) {
    console.error('[startup] Database is not ready:',err.message);
    process.exit(1);
  }
})();
