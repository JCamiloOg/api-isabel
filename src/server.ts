// ===========================================
/* NO TOCAR EN LO MÁS MINIMO */
// ===========================================

import http from "http";
import { PORT } from "./config/env.js";
import app from "./app.js";
import { prisma } from "./config/prisma.js";

const server = http.createServer(app);

const startServer = async () => {
    try {
        await prisma.$connect();

        console.log("Database connected");

        server.listen(PORT);

        server.on("listening", onListening);
    } catch (error) {
        console.error("Failed to start server", error);
        process.exit(1);
    }
};


const onListening = () => {
    console.log(`Server started on port ${PORT}`);
};

startServer();