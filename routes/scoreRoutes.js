// backend/routes/scoreRoutes.js

// Az Express keretrendszer importálása
const express = require('express');
// Express router példány létrehozása
const router = express.Router();
// A 'Score' Mongoose modell importálása az adatbázis műveletekhez
const Score = require('../models/scoreModels'); // Győződj meg róla, hogy az elérési út helyes ('scoreModel.js' lehet a fájlnév)
// A 'User' Mongoose modell importálása (a felhasználó legmagasabb pontszámának frissítéséhez)
const User = require('../models/userModel');
// Authentikációs middleware importálása (ezt kell létrehozni az útvonalak védelméhez)
// Ez a middleware fogja ellenőrizni a JWT tokent és beállítani a req.user objektumot.
const authMiddleware = require('../middleware/authMiddleware');

// === ÚJ PONTSZÁM BEKÜLDÉSE ===
// Végpont: POST /api/scores
// Leírás: Új pontszámot rögzít az adatbázisban a bejelentkezett felhasználóhoz.
// Védelem: Ez egy védett útvonal, authentikáció szükséges (authMiddleware ellenőrzi).
router.post('/', authMiddleware, async (req, res) => {
    try {
        // Pontszám és egyéb potenciális adatok kinyerése a kérés törzséből (req.body)
        const { score /*, levelReached, gameMode */ } = req.body;

        // Alapvető validáció: ellenőrizzük, hogy a pontszám meg lett-e adva
        if (typeof score === 'undefined') {
            return res.status(400).json({ message: 'A pontszám megadása kötelező.' });
        }

        // Új Score dokumentum létrehozása a kapott és az authentikált felhasználói adatok alapján
        const newScore = new Score({
            user: req.user.id,          // A felhasználó azonosítója, amit az authMiddleware állít be a req.user objektumba
            username: req.user.username,// A felhasználónév, szintén az authMiddleware által beállított req.user-ből
            score: parseInt(score, 10), // A pontszám, integerként tárolva
            // levelReached,            // Opcionális: elért szint, ha a frontend küldi
            // gameMode                 // Opcionális: játékmód, ha a frontend küldi
        });

        // Az új pontszám dokumentum mentése az adatbázisba
        await newScore.save();

        // Opcionális: A felhasználó legmagasabb pontszámának (highestScore) frissítése a User modellen.
        const user = await User.findById(req.user.id); // Megkeressük a felhasználót az adatbázisban
        if (user && parseInt(score, 10) > (user.highestScore || 0)) { // Ha van felhasználó és az új pontszám magasabb, mint az eddigi legmagasabb (vagy 0, ha még nem volt)
            user.highestScore = parseInt(score, 10); // Frissítjük a legmagasabb pontszámot
            await user.save(); // Mentjük a felhasználói dokumentumot
        }

        // Sikeres válasz küldése a kliensnek (201 Created státuszkóddal)
        res.status(201).json({ message: 'Pontszám sikeresen beküldve!', score: newScore });

    } catch (error) {
        // Hiba esetén részletes hibaüzenet logolása a szerver konzoljára
        console.error('Hiba a pontszám beküldésekor:', error);
        // Általános szerverhiba küldése a kliensnek (500 Internal Server Error)
        res.status(500).json({ message: 'Szerverhiba történt a pontszám beküldése közben.' });
    }
});

// === RANGLISTA LEKÉRDEZÉSE ===
// Végpont: GET /api/scores/leaderboard
// Leírás: Visszaadja a legjobb pontszámokat (ranglista).
// Paraméterek (opcionális query paraméterek):
//   - limit: A visszaadandó eredmények maximális száma (pl. /api/scores/leaderboard?limit=10)
//   - offset: Hány eredményt hagyjon ki a lista elejéről (lapozáshoz) (pl. /api/scores/leaderboard?offset=10&limit=10)
router.get('/leaderboard', async (req, res) => {
    try {
        // A 'limit' query paraméter feldolgozása, alapértelmezett érték 10, ha nincs megadva.
        const limit = parseInt(req.query.limit, 10) || 10;
        // Az 'offset' query paraméter feldolgozása, alapértelmezett érték 0.
        const offset = parseInt(req.query.offset, 10) || 0;

        // A legjobb pontszámok lekérdezése az adatbázisból.
        const topScores = await Score.find() // Összes Score dokumentum lekérése (mielőtt a limit/skip alkalmazódna)
            .sort({ score: -1, createdAt: 1 }) // Rendezés: először pontszám szerint csökkenő (-1), majd dátum szerint növekvő (1) sorrendben (régebbi azonos pontszám hátrébb)
            .skip(offset)                       // Az első 'offset' számú eredmény kihagyása (lapozáshoz)
            .limit(limit)                       // Maximálisan 'limit' számú eredmény visszaadása
            .populate('user', 'username avatar'); // Opcionális: A 'user' mezőben lévő ObjectId alapján betölti a kapcsolódó User dokumentum 'username' és 'avatar' mezőit.
        // Ez akkor hasznos, ha a ranglistán plusz felhasználói adatokat is meg akarsz jeleníteni.

        // Alternatív lekérdezés, ha a 'username' már denormalizálva van a Score modellen, és nincs szükség további 'user' adatokra:
        // const topScores = await Score.find()
        //   .sort({ score: -1, createdAt: 1 })
        //   .skip(offset)
        //   .limit(limit)
        //   .select('username score createdAt'); // Csak a megadott mezőket kérdezi le, hatékonyabb lehet.

        // Sikeres válasz küldése a kliensnek (200 OK státuszkóddal) a top pontszámokkal
        res.status(200).json(topScores);

    } catch (error) {
        // Hiba esetén részletes hibaüzenet logolása
        console.error('Hiba a ranglista lekérdezésekor:', error);
        // Általános szerverhiba küldése a kliensnek
        res.status(500).json({ message: 'Szerverhiba történt a ranglista lekérdezése közben.' });
    }
});

// A router exportálása, hogy az app.js (vagy a fő szerverfájl) használni tudja ezeket az útvonalakat.
module.exports = router;