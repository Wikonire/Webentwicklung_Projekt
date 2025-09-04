import * as dotenv from 'dotenv'
dotenv.config();
import app from './index.js';

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Wayfinder API läuft auf http://localhost:${PORT}  (Swagger: /api)`);
});
