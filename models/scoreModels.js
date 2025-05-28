// backend/models/scoreModel.js

// A Mongoose könyvtár importálása, ami MongoDB objektum modellezést tesz lehetővé Node.js környezetben.
const mongoose = require('mongoose');

// A 'Score' (pontszám) dokumentumok sémájának (struktúrájának) definiálása.
const scoreSchema = new mongoose.Schema({
    // A felhasználó, aki elérte a pontszámot.
    user: {
        type: mongoose.Schema.Types.ObjectId, // Típus: MongoDB ObjectId, ami egyedi azonosító.
        ref: 'User',                          // Hivatkozás (referencia) a 'User' modellre. Ez kapcsolja össze a pontszámot a felhasználói fiókkal.
        required: true
    },
    // A felhasználónév. Denormalizált adat a ranglisták könnyebb és gyorsabb megjelenítéséhez.
    // Így nem kell külön lekérdezni a felhasználói adatokat a 'User' kollekcióból a ranglista összeállításakor.
    username: {
        type: String,       // Típus: Szöveg (string).
        required: true,
        trim: true          // Eltávolítja a felesleges szóközöket a string elejéről és végéről.
    },
    // Az elért pontszám.
    score: {
        type: Number,       // Típus: Szám.
        required: true,     // Kötelező mező.
        default: 0          // Alapértelmezett érték, ha nincs megadva (pl. 0).
    },
    // Opcionális mezők, amelyeket hozzá lehetne adni a sémához:
    // levelReached: { type: Number }, // Az elért szint száma.
    // gameMode: { type: String },    // Játékmód (ha több is van).

    // A pontszám létrehozásának dátuma és ideje.
    createdAt: {
        type: Date,         // Típus: Dátum.
        default: Date.now   // Alapértelmezett érték: az aktuális dátum és idő, amikor a dokumentum létrejön.
    }
});

// Opcionális: Index létrehozása a 'score' és 'createdAt' mezőkre.
// Ez felgyorsítja a legjobb pontszámok lekérdezését és a ranglisták összeállítását.
// A { score: -1 } csökkenő sorrendet jelent a pontszám alapján (legmagasabb elöl).
// A { createdAt: -1 } másodlagos rendezési szempont lehet (legfrissebb elöl azonos pontszám esetén).
scoreSchema.index({ score: -1, createdAt: 1 }); // Gyakori: score csökkenő, createdAt növekvő (régebbi azonos pontszám hátrébb) vagy -1 a legfrissebb előnyben részesítéséhez

// A séma alapján létrehozzuk a 'Score' modellt.
// A Mongoose ezt a modellt fogja használni a 'scores' (többes szám, kisbetűvel) nevű kollekció kezelésére az adatbázisban.
const Score = mongoose.model('Score', scoreSchema);

// A Score modell exportálása, hogy más fájlokban (pl. controller-ekben) használható legyen.
module.exports = Score;