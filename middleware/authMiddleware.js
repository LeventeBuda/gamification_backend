
// A 'jsonwebtoken' csomag importálása a JWT tokenek kezeléséhez (aláírás, ellenőrzés).
const jwt = require('jsonwebtoken');
// A 'User' Mongoose modell importálása. Jelenleg a kód főként a tokenből dekódolt payload-ot használja,
// de ez a modell szükséges lenne, ha a teljes felhasználói objektumot adatbázisból töltenénk be.
const User = require('../models/userModel');

// Az aszinkron middleware függvény exportálása.
// Ez a függvény minden olyan kérésnél lefut, amelyik útvonalon ez a middleware be van regisztrálva.
// Paraméterei: req (kérés objektum), res (válasz objektum), next (függvény a következő middleware/route handler meghívásához).
module.exports = async function(req, res, next) {
    // Token kiolvasása a HTTP kérés 'Authorization' fejlécéből.
    const tokenHeader = req.header('Authorization');

    // Ellenőrzés, hogy a token egyáltalán létezik-e a fejlécben.
    if (!tokenHeader) {
        // Ha nincs token, 401-es (Unauthorized) státuszkóddal és hibaüzenettel válaszolunk.
        // Az authorizáció megtagadva, mivel nincs azonosító.
        return res.status(401).json({ message: 'Nincs token, az authorizáció megtagadva.' });
    }

    try {
        // A token ellenőrzése és dekódolása.
        // A tokenek általában "Bearer <token_string>" formátumban érkeznek.
        // Először szétválasztjuk a "Bearer" szót és magát a token stringet.
        const parts = tokenHeader.split(' '); // A fejléc string feldarabolása szóköz mentén.

        // Ellenőrizzük, hogy a formátum helyes-e (két részből áll és az első "Bearer").
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(401).json({ message: 'A token formátuma érvénytelen. "Bearer <token>" formátum szükséges.' });
        }

        const justToken = parts[1]; // Maga a JWT token string.

        // A token verifikálása a 'jsonwebtoken' csomag `verify` metódusával.
        // Szükséges hozzá a token string és a titkos kulcs (JWT_SECRET), ami a környezeti változókból (process.env) kellene, hogy jöjjön.
        // A JWT_SECRET-nek ugyanannak kell lennie, amit a token aláírásakor használtunk.
        const decoded = jwt.verify(justToken, process.env.JWT_SECRET);

        // A dekódolt payload-ból (ami a tokenben tárolt adatokat tartalmazza)
        // hozzáadjuk a felhasználói információkat a `req` (kérés) objektumhoz.
        // Így a védett útvonalak kezelői később hozzáférhetnek az authentikált felhasználó adataihoz (req.user).
        // Feltételezzük, hogy a JWT payload-unk így nézett ki a token generálásakor: { user: { id: user.id, username: user.username } }
        req.user = decoded.user;

        // Opcionális lépés: Teljes felhasználói objektum lekérése az adatbázisból, ha további ellenőrzésekre
        // vagy több felhasználói adatra van szükség a payload-ban tároltakon felül.
        // A legtöbb esetben a payload-ban lévő id és username elegendő.
        /*
        const userFromDb = await User.findById(decoded.user.id).select('-password'); // Jelszó nélkül kérjük le
        if (!userFromDb) {
          // Ha a tokenben lévő user ID-val nem található felhasználó az adatbázisban (pl. törölték a felhasználót).
          return res.status(401).json({ message: 'A tokenhez társított felhasználó nem található.' });
        }
        // Ha a teljes Mongoose user objektumra van szükség a req.user-ben:
        req.user = userFromDb;
        */

        // Ha a token érvényes és a felhasználó azonosítva lett, továbbengedjük a kérést
        // a következő middleware-re vagy a tényleges útvonal-kezelőre.
        next();
    } catch (err) {
        // Hiba esetén (pl. a token lejárt, érvénytelen, vagy a JWT_SECRET nem megfelelő)
        // a `jwt.verify` hibát fog dobni.
        console.error('Token ellenőrzési hiba:', err.message); // Hiba logolása a szerver konzoljára.
        // 401-es (Unauthorized) státuszkóddal és hibaüzenettel válaszolunk.
        res.status(401).json({ message: 'A token nem érvényes.' });
    }
};