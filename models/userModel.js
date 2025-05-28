// backend/models/userModel.js

// A Mongoose könyvtár importálása MongoDB objektum modellezéshez.
const mongoose = require('mongoose');
// A 'bcryptjs' csomag importálása a jelszavak biztonságos hasheléséhez (kivonatolásához).
const bcrypt = require('bcryptjs');

// A 'User' (felhasználó) dokumentumok sémájának (struktúrájának) definiálása.
const userSchema = new mongoose.Schema({
    username: {
        type: String,                             // Típus: Szöveg (string).
        required: [true, 'A felhasználónév megadása kötelező.'], // Kötelező mező, hibaüzenettel.
        unique: true,                             // Biztosítja, hogy minden felhasználónév egyedi legyen az adatbázisban.
        trim: true,                               // Eltávolítja a felesleges szóközöket a string elejéről és végéről.
        minlength: [3, 'A felhasználónévnek legalább 3 karakter hosszúnak kell lennie.'], // Minimális hosszúság validáció.
        maxlength: [30, 'A felhasználónév nem lehet hosszabb 30 karakternél.'] // Maximális hosszúság validáció.
    },
    email: {
        type: String,
        required: [true, 'Az email cím megadása kötelező.'],
        unique: true, // Biztosítja az email címek egyediségét.
        trim: true,
        lowercase: true, // Az email címet kisbetűs formában tárolja az egységesség érdekében.
        match: [/.+\@.+\..+/, 'Kérjük, érvényes email címet adjon meg.'] // Alapvető email formátum validáció reguláris kifejezéssel.
    },
    password: {
        type: String,
        required: [true, 'A jelszó megadása kötelező.'],
        minlength: [6, 'A jelszónak legalább 6 karakter hosszúnak kell lennie.']
        // Megjegyzés: Soha nem tároljuk a sima szöveges jelszót az adatbázisban!
        // Az itt tárolt érték a hashelt (kivonatolt) jelszó lesz.
    },
    avatar: {
        type: String,
        default: 'default_avatar_placeholder.png' // Alapértelmezett avatár kép, ha a felhasználó nem ad meg egyet. Ezt az értéket módosíthatod.
    },
    // Tömb a felhasználó által feloldott eredmények (achievements) tárolására.
    // Minden elem egy objektum, ami tartalmazza az eredmény azonosítóját és a feloldás dátumát.
    achievements: [
        {
            achievementId: { type: String, required: true }, // Pl. 'level1_cleared', 'streak_5' (egyedi azonosító)
            unlockedAt: { type: Date, default: Date.now }    // A feloldás dátuma, alapértelmezetten az aktuális idő.
        }
    ],
    // A felhasználó legmagasabb elért pontszáma a játékban.
    highestScore: {
        type: Number,
        default: 0 // Alapértelmezetten 0.
    },
    // Ide később további, játékkal kapcsolatos vagy profilmezőket lehet felvenni, például:
    // gamesPlayed: { type: Number, default: 0 },      // Lejátszott játékok száma.
    // totalPointsEarned: { type: Number, default: 0 }, // Összes szerzett pont.
    // lastLogin: { type: Date },                     // Utolsó bejelentkezés dátuma.

    // A felhasználói fiók létrehozásának dátuma és ideje.
    createdAt: {
        type: Date,
        default: Date.now // Automatikusan beállítja a létrehozás dátumát az aktuális időre.
    }
});

// Mongoose middleware (köztes szoftver): A 'save' művelet előtt fut le egy felhasználói dokumentumon.
// Ezt itt arra használjuk, hogy a jelszót hasheljük (kivonatoljuk), mielőtt az adatbázisba mentésre kerül.
userSchema.pre('save', async function(next) {
    // A 'this' kulcsszó az aktuálisan mentésre kerülő felhasználói dokumentumra hivatkozik.

    // Csak akkor hasheljük a jelszót, ha az módosítva lett (vagy új felhasználó esetén, amikor még nincs hashelve).
    // Ha a jelszó nem változott (pl. egy profilfrissítésnél csak az emailt módosítják), akkor nem kell újra hashelni.
    if (!this.isModified('password')) {
        return next(); // Ha a jelszó nem módosult, továbblépünk a következő middleware-re vagy a mentési műveletre.
    }

    try {
        // "Salt" (só) generálása. A só egy véletlenszerű string, amit a jelszóhoz adunk a hashelés előtt.
        // Ez nehezebbé teszi a szótár- és szivárványtábla-támadásokat.
        // A 10-es érték (cost factor) egy gyakori és jó erősségi szint a salt generálásához.
        const salt = await bcrypt.genSalt(10);

        // A jelszó hashelése a generált salt felhasználásával.
        this.password = await bcrypt.hash(this.password, salt);

        next(); // Továbbhaladás a felhasználói dokumentum mentésével.
    } catch (error) {
        next(error); // Hiba esetén továbbadjuk a hibát a Mongoose hibakezelőjének.
    }
});

// Példány metódus (instance method) definiálása a userSchema-n.
// Ez a metódus összehasonlítja a megadott 'candidatePassword'-ot (a bejelentkezéskor beírt jelszót)
// a felhasználó adatbázisban tárolt (hashelt) jelszavával.
userSchema.methods.comparePassword = async function(candidatePassword) {
    // 'this.password' a felhasználó adatbázisban tárolt, már hashelt jelszava.
    // A bcrypt.compare metódus biztonságosan összehasonlítja a beírt jelszót (amit szintén hashel) a tárolt hash-sel.
    // Igaz értékkel tér vissza, ha a jelszavak megegyeznek, egyébként hamissal.
    return bcrypt.compare(candidatePassword, this.password);
};

// A 'User' modell létrehozása a userSchema alapján.
// A Mongoose ezt a modellt fogja használni a 'users' (többes szám, kisbetűvel) nevű kollekció kezelésére az adatbázisban.
const User = mongoose.model('User', userSchema);

// A User modell exportálása, hogy az alkalmazás más részeiben (pl. authentikációs útvonalak, score mentés) használható legyen.
module.exports = User;