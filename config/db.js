
// A Mongoose könyvtár importálása, ami a MongoDB objektum-adat modellezését (ODM) biztosítja.
const mongoose = require('mongoose');

// A 'dotenv' csomag importálása és konfigurálása a környezeti változók .env fájlból való betöltéséhez.
// A `path` opció megadja a .env fájl relatív elérési útját ehhez a (db.js) fájlhoz képest.

require('dotenv').config({ path: '../.env' });

// Aszinkron függvény az adatbázishoz való csatlakozás kezelésére.
const connectDB = async () => {
    try {
        // Csatlakozási kísérlet a MongoDB adatbázishoz a Mongoose `connect` metódusával.
        // A kapcsolódási stringet (MONGO_URI) a környezeti változókból olvassuk ki (process.env).
        // Ezt a MONGO_URI változót a .env fájlban kell definiálni.
        await mongoose.connect(process.env.MONGO_URI, {
            // Az alábbi opciók a régebbi Mongoose verziókban voltak szükségesek
            // az elavulási figyelmeztetések (deprecation warnings) elkerülésére.
            // A Mongoose 6-os vagy újabb verziói ezeket alapértelmezetten kezelik,
            // így általában már nem szükséges expliciten megadni őket.
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
            // useCreateIndex: true, // A Mongoose 6+ verziókban már nem szükséges/támogatott.
            // useFindAndModify: false, // A Mongoose 6+ verziókban már nem szükséges/támogatott.
        });

        // Sikeres csatlakozás esetén üzenet kiírása a konzolra.
        console.log('MongoDB sikeresen csatlakoztatva!');

    } catch (error) {
        // Hiba esetén a hibaüzenet kiírása a konzolra.
        console.error('MongoDB csatlakozási hiba:', error.message);

        // A Node.js folyamat leállítása hibakóddal (1 jelzi a hibát).
        // Ez fontos, mert ha az adatbázis-kapcsolat nem jön létre, az alkalmazás valószínűleg nem tud megfelelően működni.
        process.exit(1);
    }
};

// A connectDB függvény exportálása, hogy más fájlokban (pl. a fő szerverfájlban, server.js vagy app.js)
// meghívható legyen az adatbázis-kapcsolat létrehozásához.
module.exports = connectDB;