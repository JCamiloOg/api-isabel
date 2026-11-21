// ===========================================================
/* NO TOCAR EN LO MÁS MÍNIMO, SI LO HACEN, AVISEN Y PIDAN PERMISO */
// ===========================================================

import express, { urlencoded } from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { NODE_ENV, CORS_ORIGINS } from "./config/env.js";
import rootRouter from "./routes/index.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        // Permitir peticiones sin origen (como Postman/Server-to-Server) o si está en la lista blanca
        if (!origin || CORS_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`Origen ${origin} no permitido por CORS`));
        }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
};

// app.use(cors(...)) intercepta GET, POST, etc. y también los OPTIONS preflight automáticamente
app.use(cors(corsOptions));

// Opcional en Express 5: Si deseas responder preflights de forma explícita usa la RegEx /(.*)/
app.options(/(.*)/, cors(corsOptions));

if (NODE_ENV === "development") app.use(morgan("dev"));

app.use(express.json());
app.use(urlencoded({ extended: true }));
app.use(cookieParser());


app.get("/", (req, res) => {
    res.send("Api ISABEL en linea.");
});

app.use("/api", rootRouter);

app.use((req, res) => {
    res.status(404).json({ message: "Ruta no encontrada o movida." });
});

// MiddlewareGlobal para errores
app.use(errorHandler);

export default app;