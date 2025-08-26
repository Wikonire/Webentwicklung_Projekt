require('dotenv').config();
const app = require('./index');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Wayfinder API läuft auf http://localhost:${PORT}  (Swagger: /api)`);
});
