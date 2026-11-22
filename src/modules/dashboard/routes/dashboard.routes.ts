import { Router } from "express";
import {
  getVentasActuales,
  getTopClientes,
  getTopDeudores,
  getGastosMes,
  getGananciaNetaMes,
  getGanancias6Meses,
  getProductosMenosStock,
  getProductosMasStock,
  getPedidosPendientes,
  getProductoMasVendido,
  getProductosMenosVendidos,
  getVentasVsGastos,
} from "../controllers/dashboard.controller.js";

const router = Router();

// Si usas autenticación/permisos, agrégalo aquí para todo el dashboard:
// router.use(authMiddleware, requirePrivilege("Dashboard", "Read"));

// --- Tarjetas / indicadores ---
router.get("/ventas-actuales", getVentasActuales);         // ?periodo=dia|mes|anio
router.get("/gastos-mes", getGastosMes);                   // ?mes=YYYY-MM
router.get("/ganancia-neta-mes", getGananciaNetaMes);      // ?mes=YYYY-MM
router.get("/pedidos-pendientes", getPedidosPendientes);
router.get("/producto-mas-vendido", getProductoMasVendido);
router.get("/productos-menos-vendidos", getProductosMenosVendidos);

// --- Rankings / tablas ---
router.get("/top-clientes", getTopClientes);
router.get("/top-deudores", getTopDeudores);

// --- Gráficas ---
router.get("/ganancias-6-meses", getGanancias6Meses);      // ?mes=YYYY-MM
router.get("/ventas-vs-gastos", getVentasVsGastos);        // ?mes=YYYY-MM
router.get("/productos-menos-stock", getProductosMenosStock);
router.get("/productos-mas-stock", getProductosMasStock);

export default router;

// En tu app.ts / server.ts:
//   import dashboardRoutes from "./routes/dashboard.routes";
//   app.use("/api/dashboard", dashboardRoutes);
