

// A 'dotenv' csomag importálása és konfigurálása a .env fájlban tárolt környezeti változók betöltéséhez.
// Ez lehetővé teszi, hogy érzékeny adatokat (pl. adatbázis kapcsolódási string, JWT titkos kulcs)
// ne közvetlenül a kódban tároljunk, hanem egy külön .env fájlban, amit nem töltünk fel a verziókezelőbe.
require('dotenv').config(); // Alapértelmezetten a projekt gyökerében keresi a .env fájlt.

// Az Express.js keretrendszer importálása, ami egy népszerű Node.js webalkalmazás keretrendszer.
const express = require('express');
// A 'cors' (Cross-Origin Resource Sharing) middleware importálása.
// Ez lehetővé teszi, hogy a frontend alkalmazás (ami valószínűleg más porton vagy domainen fut fejlesztés közben)
// HTTP kéréseket küldhessen ehhez a backend szerverhez.
const cors = require('cors');
// Az adatbázis-kapcsolatot létrehozó függvény importálása a ./config/db.js fájlból.
const connectDB = require('./config/db');

// Express alkalmazás inicializálása. Az 'app' objektum fogja reprezentálni a webalkalmazásunkat.
const app = express();

// Csatlakozás az adatbázishoz.
// A connectDB() egy aszinkron függvény, amit a db.js-ben definiáltunk.
connectDB();

// === Middleware-ek Beállítása ===
// A middleware-ek olyan függvények, amelyek minden bejövő kérésen vagy egy adott útvonalra érkező kérésen lefutnak,
// mielőtt az elérné a tényleges útvonal-kezelő logikát.

// CORS engedélyezése minden bejövő kérésre.
// Ez lehetővé teszi, hogy más domainekről (pl. a frontend fejlesztői szerveréről) érkező kéréseket fogadjon a backend.
app.use(cors());

// Beépített Express middleware a JSON formátumú kérés törzsek (request bodies) feldolgozásához.
// Ez teszi lehetővé, hogy a req.body objektumon keresztül hozzáférjünk a kliens által küldött JSON adatokhoz.
app.use(express.json());

// Beépített Express middleware az URL-kódolt kérés törzsek feldolgozásához.
// Az { extended: false } opció egyszerű (nem beágyazott) objektumok feldolgozását teszi lehetővé.
app.use(express.urlencoded({ extended: false }));

// === Alapvető Útvonalak ===

// Egy egyszerű GET végpont a gyökér útvonalon ('/').
// Tesztelési célokra hasznos lehet, hogy ellenőrizzük, fut-e a szerver.
app.get('/', (req, res) => {
    res.send('Math Game API fut!'); // Egyszerű szöveges választ küld vissza.
});

// === API Útvonalak Csatlakoztatása ===
// Az alkalmazás különböző részeihez tartozó útvonalakat külön fájlokban (router-ekben) definiáljuk
// és itt csatlakoztatjuk őket egy alapútvonalhoz.

// Authentikációs útvonalak csatlakoztatása az '/api/auth' alapútvonalhoz.
// A './routes/authRoutes' fájlban definiált útvonalak (pl. /register, /login) itt válnak elérhetővé
// mint /api/auth/register, /api/auth/login.
app.use('/api/auth', require('./routes/authRoutes'));

// Pontszámokkal kapcsolatos útvonalak csatlakoztatása az '/api/scores' alapútvonalhoz.
// A './routes/scoreRoutes' fájlban definiált útvonalak (pl. /, /leaderboard) itt válnak elérhetővé
// mint /api/scores, /api/scores/leaderboard.
app.use('/api/scores', require('./routes/scoreRoutes'));


// === Alapvető Hibakezelő Middleware (opcionális, de jó gyakorlat) ===
// Ezt a middleware-t a többi útvonal és middleware után kell elhelyezni.
// Ha egy korábbi útvonal-kezelő vagy middleware next(err)-t hív, ez fogja elkapni a hibát.
/*
app.use((err, req, res, next) => {
  console.error("Hiba történt a szerveren:", err.stack); // Hiba logolása a szerver konzoljára.
  res.status(500).send('Valami meghibásodott a szerveren!'); // Általános hibaüzenet küldése a kliensnek.
});
*/

// A portszám meghatározása, amin a szerver figyelni fog.
// Először a környezeti változókban (process.env.PORT) keresi,
// ha ott nincs definiálva, akkor az 5000-es portot használja alapértelmezettként.
const PORT = process.env.PORT || 5000;

// A szerver elindítása a megadott porton.
// A callback függvény akkor fut le, amikor a szerver sikeresen elindult és elkezdett figyelni a bejövő kérésekre.
app.listen(PORT, () => {
    console.log(`A szerver fut a http://localhost:${PORT} címen`);
});