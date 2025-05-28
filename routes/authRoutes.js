// backend/routes/authRoutes.js

// Az Express keretrendszer importálása a szerveroldali útvonalak és alkalmazáslogika létrehozásához.
const express = require('express');
// Express router példány létrehozása. Ezt EGYSZER kell létrehozni ebben a fájlban.
// Ez a router fogja kezelni az '/api/auth' kezdetű útvonalakat (ezt a fő szerverfájlban kell beállítani).
const router = express.Router();
// A 'User' Mongoose modell importálása az adatbázis-műveletekhez (felhasználók keresése, létrehozása).
const User = require('../models/userModel');
// A 'jsonwebtoken' csomag importálása JSON Web Tokenek (JWT) létrehozásához és kezeléséhez a bejelentkezési útvonalon.
// Győződj meg róla, hogy ez a sor nincs kikommentelve, ha a bejelentkezési útvonal tokent generál.
const jwt = require('jsonwebtoken');

// === ÚJ FELHASZNÁLÓ REGISZTRÁCIÓJA ===
// Végpont: POST /api/auth/register
// Leírás: Új felhasználói fiókot hoz létre a rendszerben.
router.post('/register', async (req, res) => {
    try {
        // Felhasználói adatok kinyerése a HTTP kérés törzséből (req.body).
        const { username, email, password, avatar } = req.body;

        // Alapvető validáció: ellenőrizzük, hogy a kötelező mezők (felhasználónév, email, jelszó) meg lettek-e adva.
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'A felhasználónév, email és jelszó megadása kötelező.' });
        }

        // Ellenőrzés, hogy létezik-e már felhasználó a megadott email címmel.
        const existingUserByEmail = await User.findOne({ email }); // Keresés az adatbázisban email alapján.
        if (existingUserByEmail) {
            // Ha igen, 400-as (Bad Request) hibával válaszolunk, jelezve, hogy az email már foglalt.
            return res.status(400).json({ message: 'Ezzel az email címmel már létezik fiók.' });
        }
        // Ellenőrzés, hogy létezik-e már felhasználó a megadott felhasználónévvel.
        const existingUserByUsername = await User.findOne({ username }); // Keresés felhasználónév alapján.
        if (existingUserByUsername) {
            // Ha igen, 400-as hibával válaszolunk, jelezve, hogy a felhasználónév már foglalt.
            return res.status(400).json({ message: 'Ez a felhasználónév már foglalt.' });
        }

        // Új User dokumentum létrehozása a kapott adatokkal.
        // A jelszó hashelése a userModel.js-ben definiált 'pre.save' middleware segítségével történik automatikusan.
        const newUser = new User({
            username,
            email,
            password,
            avatar: avatar || undefined // Ha az avatar üres string, undefined-ként adjuk át, hogy a séma alapértelmezett értéke érvényesüljön.
        });

        // Az új felhasználó dokumentum mentése az adatbázisba.
        await newUser.save();

        // Sikeres regisztráció esetén 201-es (Created) státuszkóddal és üzenettel, valamint a felhasználó alapadataival válaszolunk.
        // Fontos: A jelszót SOHA nem küldjük vissza a kliensnek!
        res.status(201).json({
            message: 'Felhasználó sikeresen regisztrálva! Kérjük, jelentkezzen be.',
            user: { // Csak a biztonságos és szükséges adatokat küldjük vissza.
                id: newUser.id, // vagy newUser._id
                username: newUser.username,
                email: newUser.email,
                avatar: newUser.avatar
            }
        });

    } catch (error) {
        // Hibakezelés.
        // Ha Mongoose validációs hiba történt (pl. minlength, maxlength nem teljesül a userModel-ben).
        if (error.name === 'ValidationError') {
            let errors = {}; // Objektum a validációs hibák összegyűjtésére.
            // Végigmegyünk a Mongoose által dobott hibákon és összegyűjtjük őket.
            Object.keys(error.errors).forEach((key) => {
                errors[key] = error.errors[key].message;
            });
            return res.status(400).json({ message: "Validációs Hiba", errors });
        }
        // Egyéb szerveroldali hibák logolása és általános hibaüzenet küldése.
        console.error('Regisztrációs Hiba:', error);
        res.status(500).json({ message: 'Szerverhiba történt a regisztráció során.' });
    }
});

// === MEGLÉVŐ FELHASZNÁLÓ BEJELENTKEZTETÉSE ===
// Végpont: POST /api/auth/login
// Leírás: Authentikálja a felhasználót és sikeres bejelentkezés esetén JWT tokent ad vissza.
router.post('/login', async (req, res) => {
    try {
        // Email és jelszó kinyerése a kérés törzséből.
        const { email, password } = req.body;

        // 1. Bemeneti adatok validálása: ellenőrizzük, hogy mindkét mező meg lett-e adva.
        if (!email || !password) {
            return res.status(400).json({ message: 'Kérjük, adja meg az email címet és a jelszót is.' });
        }

        // 2. Felhasználó keresése az adatbázisban email cím alapján.
        const user = await User.findOne({ email });
        // Ha nem található felhasználó ezzel az email címmel, vagy ha a jelszó nem egyezik (lásd alább),
        // általános "Érvénytelen hitelesítő adatok" üzenetet küldünk biztonsági okokból
        // (nem áruljuk el, hogy az email vagy a jelszó volt-e hibás).
        if (!user) {
            return res.status(401).json({ message: 'Érvénytelen hitelesítő adatok.' }); // 401 Unauthorized
        }

        // 3. A beküldött jelszó összehasonlítása az adatbázisban tárolt hashelt jelszóval.
        // A user.comparePassword() egy metódus, amit a userModel.js-ben definiáltunk.
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            // Ha a jelszavak nem egyeznek, szintén általános hibaüzenetet küldünk.
            return res.status(401).json({ message: 'Érvénytelen hitelesítő adatok.' });
        }

        // 4. A felhasználó sikeresen authentikálva, JWT (JSON Web Token) generálása.
        // A payload tartalmazza azokat az adatokat, amiket a tokenbe szeretnénk kódolni.
        // Tipikusan a felhasználó egyedi azonosítóját és esetleg más nem érzékeny adatokat (pl. felhasználónév).
        const payload = {
            user: {
                id: user.id,        // Felhasználó egyedi azonosítója (MongoDB _id)
                username: user.username // Felhasználónév
            }
        };

        // A token aláírása a .env fájlban tárolt JWT_SECRET titkos kulccsal.
        // Beállítunk egy lejárati időt is a tokenhez (pl. '1h' = 1 óra, '7d' = 7 nap).
        // Győződj meg róla, hogy a JWT_SECRET definiálva van a .env fájlodban!
        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Token lejárati ideje
        );

        // 5. A token és a felhasználói alapadatok visszaküldése a kliensnek.
        // A kliensoldal ezt a tokent fogja használni a védett API végpontok eléréséhez.
        // Fontos: A jelszót itt sem küldjük vissza!
        res.status(200).json({
            message: 'Sikeres bejelentkezés!',
            token, // Az generált JWT token
            user: { // Felhasználói adatok a kliensoldali állapot frissítéséhez
                id: user.id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
            }
        });

    } catch (error) {
        // Általános szerveroldali hibakezelés.
        console.error('Bejelentkezési Hiba:', error);
        res.status(500).json({ message: 'Szerverhiba történt a bejelentkezés során.' });
    }
});

// A router példány exportálása, hogy a fő szerverfájl (pl. app.js vagy server.js)
// be tudja tölteni és használni tudja ezeket az authentikációs útvonalakat.
// Az exportálás EGYSZER történik a fájl végén.
module.exports = router;