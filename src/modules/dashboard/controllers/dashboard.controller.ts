import { Prisma, PurchasesStatus, SaleStatus } from "@prisma/client";
import { RequestHandler } from "express";
import { prisma } from "../../../config/prisma.js";


const SALE_COMPLETED = SaleStatus.Entregada;
const PURCHASE_PENDING = PurchasesStatus.Pendiente;
const PRODUCT_ACTIVE = true;

const MES_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const PERIODOS = ["dia", "mes", "anio"] as const;


type Periodo = (typeof PERIODOS)[number];

type VentasActuales = { periodo: string; cantidad_ventas: number; ingresos_totales: number };

type TopCliente = {
    top: number;
    documento: string;
    nombre: string;
    apellido: string;
    cantidad_compras: number;
    total_comprado: number;
};

type TopDeudor = {
    top: number;
    documento: string;
    nombre: string;
    apellido: string;
    total_comprado: number;
    deuda_pendiente: number;
};

type GastosMes = { mes: string; total_gastos: number };

type GananciaNetaMes = {
    mes_actual: string;
    ganancia_neta_actual: number;
    ganancia_neta_anterior: number;
    diferencia_monto: number;
    porcentaje_incremento: number;
};

type Ganancia6Meses = {
    mes: string;
    total_ingresos: number;
    total_costo_ventas: number;
    total_gastos: number;
    ganancia_bruta: number;
    ganancia_neta: number;
};

type ProductoStock = {
    id_producto: number;
    producto: string;
    marca: string;
    categoria: string;
    stock_total: number;
};

type ProductoVendido = {
    id_producto: number;
    producto: string;
    marca: string;
    total_unidades_vendidas: number;
};

type VentasVsGastos = { anio_mes: string; total_ventas: number; total_gastos: number };

type QueryMes = { mes?: string };

// ============================================================================
// SELECTS REUTILIZABLES
// ============================================================================

/** Lo mínimo para calcular el total de una venta: descuento, IVA y líneas */
const ventaTotalSelect = {
    discount: true,
    vat: true,
    saleDetails: {
        select: { quantity: true, unitPrice: true }
    }
} satisfies Prisma.SaleSelect;

// ============================================================================
// HELPERS DE FECHAS (todo en UTC; para ajustar zona horaria se cambia aquí)
// ============================================================================


const parseMes = (mes?: string): Date | null => {
    if (mes === undefined || mes === "") {
        const now = new Date();
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    }
    if (!MES_REGEX.test(mes)) return null;
    const [year, month] = mes.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, 1));
};

const addMonths = (date: Date, months: number) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));

/** Date -> "YYYY-MM" */
const monthKey = (date: Date) => date.toISOString().slice(0, 7);

/** Los últimos `count` meses terminando en `ultimo`, de más antiguo a más reciente */
const lastMonths = (ultimo: Date, count = 6) =>
    Array.from({ length: count }, (_, i) => addMonths(ultimo, i - (count - 1)));

const rangoPeriodo = (periodo: Periodo) => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const d = now.getUTCDate();

    switch (periodo) {
        case "dia":
            return {
                inicio: new Date(Date.UTC(y, m, d)),
                fin: new Date(Date.UTC(y, m, d + 1)),
                etiqueta: now.toISOString().slice(0, 10)
            };
        case "mes":
            return {
                inicio: new Date(Date.UTC(y, m, 1)),
                fin: new Date(Date.UTC(y, m + 1, 1)),
                etiqueta: now.toISOString().slice(0, 7)
            };
        case "anio":
            return {
                inicio: new Date(Date.UTC(y, 0, 1)),
                fin: new Date(Date.UTC(y + 1, 0, 1)),
                etiqueta: now.toISOString().slice(0, 4)
            };
    }
};


type VentaParaTotal = Prisma.SaleGetPayload<{ select: typeof ventaTotalSelect }>;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Suma de cantidad × precio de las líneas (antes de descuento e IVA) */
const subtotal = (venta: VentaParaTotal) =>
    venta.saleDetails.reduce((acc, d) => acc + d.quantity * Number(d.unitPrice), 0);

/** Ingreso de la venta: subtotal con descuento, sin IVA */
const ingresoVenta = (venta: VentaParaTotal) =>
    subtotal(venta) * (1 - Number(venta.discount) / 100);

/** Total de la venta: subtotal con descuento e IVA */
const totalVenta = (venta: VentaParaTotal) =>
    ingresoVenta(venta) * (1 + Number(venta.vat) / 100);

type ResumenMes = { ingresos: number; ventasConIva: number; costoVentas: number; gastos: number };

const resumenVacio = (): ResumenMes => ({ ingresos: 0, ventasConIva: 0, costoVentas: 0, gastos: 0 });

/**
 * Resumen financiero por mes ("YYYY-MM") entre `desde` (incluido) y `hasta` (excluido):
 * ingresos (sin IVA), ventas con IVA, costo de lo vendido y gastos.
 */
const resumenPorMes = async (desde: Date, hasta: Date) => {
    const [ventas, gastos] = await Promise.all([
        prisma.sale.findMany({
            select: {
                saleDate: true,
                ...ventaTotalSelect,
                saleDetails: {
                    select: {
                        quantity: true,
                        unitPrice: true,
                        variant: {
                            select: {
                                productColor: {
                                    select: {
                                        product: { select: { purchasePrice: true } }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            where: {
                status: SALE_COMPLETED,
                saleDate: { gte: desde, lt: hasta }
            }
        }),
        prisma.expense.findMany({
            select: { date: true, amount: true },
            where: { date: { gte: desde, lt: hasta } }
        })
    ]);

    const meses = new Map<string, ResumenMes>();
    const getMes = (key: string) => {
        const existente = meses.get(key);
        if (existente) return existente;
        const nuevo = resumenVacio();
        meses.set(key, nuevo);
        return nuevo;
    };

    for (const venta of ventas) {
        const mes = getMes(monthKey(venta.saleDate));
        mes.ingresos += ingresoVenta(venta);
        mes.ventasConIva += totalVenta(venta);
        mes.costoVentas += venta.saleDetails.reduce(
            (acc, d) => acc + d.quantity * Number(d.variant.productColor.product.purchasePrice),
            0
        );
    }

    for (const gasto of gastos) {
        getMes(monthKey(gasto.date)).gastos += Number(gasto.amount);
    }

    return meses;
};

const gananciaNeta = (r: ResumenMes) => r.ingresos - r.costoVentas - r.gastos;

/** Stock total por producto (suma de todas sus variantes) */
const stockPorProducto = async (): Promise<ProductoStock[]> => {
    const productos = await prisma.product.findMany({
        select: {
            id: true,
            name: true,
            brand: { select: { name: true } },
            productCategory: { select: { name: true } },
            productColors: {
                select: {
                    productVariants: { select: { currentStock: true } }
                }
            }
        },
        // Solo productos con al menos una variante
        where: { productColors: { some: { productVariants: { some: {} } } } }
    });

    return productos.map((p) => ({
        id_producto: p.id,
        producto: p.name,
        marca: p.brand.name,
        categoria: p.productCategory.name,
        stock_total: p.productColors.reduce(
            (acc, pc) => acc + pc.productVariants.reduce((a, v) => a + v.currentStock, 0),
            0
        )
    }));
};

/** Unidades vendidas por producto (solo ventas completadas). Incluye productos con 0 ventas. */
const unidadesVendidasPorProducto = async (soloActivos: boolean): Promise<ProductoVendido[]> => {
    const productos = await prisma.product.findMany({
        select: {
            id: true,
            name: true,
            brand: { select: { name: true } },
            productColors: {
                select: {
                    productVariants: {
                        select: {
                            saleDetails: {
                                select: { quantity: true },
                                where: { sale: { status: SALE_COMPLETED } }
                            }
                        }
                    }
                }
            }
        },
        where: soloActivos ? { status: PRODUCT_ACTIVE } : undefined
    });

    return productos.map((p) => ({
        id_producto: p.id,
        producto: p.name,
        marca: p.brand.name,
        total_unidades_vendidas: p.productColors.reduce(
            (acc, pc) =>
                acc +
                pc.productVariants.reduce(
                    (a, v) => a + v.saleDetails.reduce((s, d) => s + d.quantity, 0),
                    0
                ),
            0
        )
    }));
};


export const getVentasActuales: RequestHandler<
    unknown,
    { message: string; ventas?: VentasActuales },
    unknown,
    { periodo?: Periodo }
> = async (req, res, next) => {
    try {
        const { periodo = "mes" } = req.query;

        if (!PERIODOS.includes(periodo)) return res.status(400).json({
            message: "Periodo inválido. Use: dia, mes o anio."
        });

        const { inicio, fin, etiqueta } = rangoPeriodo(periodo);

        const ventas = await prisma.sale.findMany({
            select: ventaTotalSelect,
            where: {
                status: SALE_COMPLETED,
                saleDate: { gte: inicio, lt: fin },
                saleDetails: { some: {} }
            }
        });

        return res.status(200).json({
            message: "Ventas obtenidas exitosamente",
            ventas: {
                periodo: etiqueta,
                cantidad_ventas: ventas.length,
                ingresos_totales: round2(ventas.reduce((acc, v) => acc + totalVenta(v), 0))
            }
        });
    } catch (error) {
        next(error);
    }
};


export const getTopClientes: RequestHandler<
    unknown,
    { message: string; topClientes?: TopCliente[] }
> = async (_req, res, next) => {
    try {
        const ventas = await prisma.sale.findMany({
            select: {
                ...ventaTotalSelect,
                customer: {
                    select: { identityDocument: true, firstName: true, lastName: true }
                }
            },
            where: {
                status: SALE_COMPLETED,
                saleDetails: { some: {} }
            }
        });

        const clientes = new Map<string, Omit<TopCliente, "top">>();

        for (const venta of ventas) {
            const { identityDocument, firstName, lastName } = venta.customer;
            const cliente = clientes.get(identityDocument) ?? {
                documento: identityDocument,
                nombre: firstName,
                apellido: lastName,
                cantidad_compras: 0,
                total_comprado: 0
            };

            cliente.cantidad_compras += 1;
            cliente.total_comprado += totalVenta(venta);
            clientes.set(identityDocument, cliente);
        }

        const topClientes: TopCliente[] = [...clientes.values()]
            .sort((a, b) => b.total_comprado - a.total_comprado)
            .slice(0, 10)
            .map((c, i) => ({ top: i + 1, ...c, total_comprado: round2(c.total_comprado) }));

        return res.status(200).json({
            message: "Top de clientes obtenido exitosamente",
            topClientes
        });
    } catch (error) {
        next(error);
    }
};


export const getTopDeudores: RequestHandler<
    unknown,
    { message: string; topDeudores?: TopDeudor[] }
> = async (_req, res, next) => {
    try {
        const ventas = await prisma.sale.findMany({
            select: {
                ...ventaTotalSelect,
                isCredit: true,
                payments: { select: { amount: true } },
                customer: {
                    select: { identityDocument: true, firstName: true, lastName: true }
                }
            },
            where: {
                status: SALE_COMPLETED,
                saleDetails: { some: {} }
            }
        });

        const clientes = new Map<string, Omit<TopDeudor, "top">>();

        for (const venta of ventas) {
            const { identityDocument, firstName, lastName } = venta.customer;
            const cliente = clientes.get(identityDocument) ?? {
                documento: identityDocument,
                nombre: firstName,
                apellido: lastName,
                total_comprado: 0,
                deuda_pendiente: 0
            };

            const total = totalVenta(venta);
            cliente.total_comprado += total;

            // Si es a crédito, restamos los abonos; si es de contado, la deuda es 0
            if (venta.isCredit) {
                const pagado = venta.payments.reduce((acc, p) => acc + Number(p.amount), 0);
                cliente.deuda_pendiente += total - pagado;
            }

            clientes.set(identityDocument, cliente);
        }

        const topDeudores: TopDeudor[] = [...clientes.values()]
            .sort((a, b) =>
                b.deuda_pendiente - a.deuda_pendiente || b.total_comprado - a.total_comprado
            )
            .slice(0, 10)
            .map((c, i) => ({
                top: i + 1,
                ...c,
                total_comprado: round2(c.total_comprado),
                deuda_pendiente: round2(c.deuda_pendiente)
            }));

        return res.status(200).json({
            message: "Top de deudores obtenido exitosamente",
            topDeudores
        });
    } catch (error) {
        next(error);
    }
};


export const getGastosMes: RequestHandler<
    unknown,
    { message: string; gastos?: GastosMes },
    unknown,
    QueryMes
> = async (req, res, next) => {
    try {
        const inicio = parseMes(req.query.mes);

        if (!inicio) return res.status(400).json({
            message: "Mes inválido. Formato esperado: YYYY-MM."
        });

        const { _sum } = await prisma.expense.aggregate({
            _sum: { amount: true },
            where: { date: { gte: inicio, lt: addMonths(inicio, 1) } }
        });

        return res.status(200).json({
            message: "Gastos del mes obtenidos exitosamente",
            gastos: {
                mes: monthKey(inicio),
                total_gastos: Number(_sum.amount ?? 0)
            }
        });
    } catch (error) {
        next(error);
    }
};


export const getGananciaNetaMes: RequestHandler<
    unknown,
    { message: string; ganancia?: GananciaNetaMes },
    unknown,
    QueryMes
> = async (req, res, next) => {
    try {
        const inicio = parseMes(req.query.mes);

        if (!inicio) return res.status(400).json({
            message: "Mes inválido. Formato esperado: YYYY-MM."
        });

        const anterior = addMonths(inicio, -1);
        const meses = await resumenPorMes(anterior, addMonths(inicio, 1));

        const actualNeta = gananciaNeta(meses.get(monthKey(inicio)) ?? resumenVacio());
        const anteriorNeta = gananciaNeta(meses.get(monthKey(anterior)) ?? resumenVacio());

        const porcentaje =
            anteriorNeta === 0
                ? 100
                : ((actualNeta - anteriorNeta) / Math.abs(anteriorNeta)) * 100;

        return res.status(200).json({
            message: "Ganancia neta obtenida exitosamente",
            ganancia: {
                mes_actual: monthKey(inicio),
                ganancia_neta_actual: round2(actualNeta),
                ganancia_neta_anterior: round2(anteriorNeta),
                diferencia_monto: round2(actualNeta - anteriorNeta),
                porcentaje_incremento: round2(porcentaje)
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getGanancias6Meses: RequestHandler<
    unknown,
    { message: string; ganancias?: Ganancia6Meses[] },
    unknown,
    QueryMes
> = async (req, res, next) => {
    try {
        const inicio = parseMes(req.query.mes);

        if (!inicio) return res.status(400).json({
            message: "Mes inválido. Formato esperado: YYYY-MM."
        });

        const periodos = lastMonths(inicio);
        const meses = await resumenPorMes(periodos[0], addMonths(inicio, 1));

        // Un mes sin movimientos aparece igual, con ceros
        const ganancias: Ganancia6Meses[] = periodos.map((fecha) => {
            const r = meses.get(monthKey(fecha)) ?? resumenVacio();
            return {
                mes: monthKey(fecha),
                total_ingresos: round2(r.ingresos),
                total_costo_ventas: round2(r.costoVentas),
                total_gastos: round2(r.gastos),
                ganancia_bruta: round2(r.ingresos - r.costoVentas),
                ganancia_neta: round2(gananciaNeta(r))
            };
        });

        return res.status(200).json({
            message: "Ganancias obtenidas exitosamente",
            ganancias
        });
    } catch (error) {
        next(error);
    }
};


export const getProductosMenosStock: RequestHandler<
    unknown,
    { message: string; productos?: ProductoStock[] }
> = async (_req, res, next) => {
    try {
        const productos = (await stockPorProducto())
            .sort((a, b) => a.stock_total - b.stock_total || a.id_producto - b.id_producto)
            .slice(0, 10);

        return res.status(200).json({
            message: "Productos con menos stock obtenidos exitosamente",
            productos
        });
    } catch (error) {
        next(error);
    }
};


export const getProductosMasStock: RequestHandler<
    unknown,
    { message: string; productos?: ProductoStock[] }
> = async (_req, res, next) => {
    try {
        const productos = (await stockPorProducto())
            .sort((a, b) => b.stock_total - a.stock_total || a.id_producto - b.id_producto)
            .slice(0, 10);

        return res.status(200).json({
            message: "Productos con más stock obtenidos exitosamente",
            productos
        });
    } catch (error) {
        next(error);
    }
};


export const getPedidosPendientes: RequestHandler<
    unknown,
    { message: string; pedidosPendientes?: number }
> = async (_req, res, next) => {
    try {
        const pedidosPendientes = await prisma.purchase.count({
            where: { status: PURCHASE_PENDING }
        });

        return res.status(200).json({
            message: "Pedidos pendientes obtenidos exitosamente",
            pedidosPendientes
        });
    } catch (error) {
        next(error);
    }
};


export const getProductoMasVendido: RequestHandler<
    unknown,
    { message: string; producto?: ProductoVendido | null }
> = async (_req, res, next) => {
    try {
        const [masVendido] = (await unidadesVendidasPorProducto(false))
            .filter((p) => p.total_unidades_vendidas > 0)
            .sort((a, b) =>
                b.total_unidades_vendidas - a.total_unidades_vendidas || a.id_producto - b.id_producto
            );

        return res.status(200).json({
            message: "Producto más vendido obtenido exitosamente",
            producto: masVendido ?? null
        });
    } catch (error) {
        next(error);
    }
};


export const getProductosMenosVendidos: RequestHandler<
    unknown,
    { message: string; productos?: ProductoVendido[] }
> = async (_req, res, next) => {
    try {
        const productos = (await unidadesVendidasPorProducto(true))
            .sort((a, b) =>
                a.total_unidades_vendidas - b.total_unidades_vendidas || a.id_producto - b.id_producto
            )
            .slice(0, 2);

        return res.status(200).json({
            message: "Productos menos vendidos obtenidos exitosamente",
            productos
        });
    } catch (error) {
        next(error);
    }
};


export const getVentasVsGastos: RequestHandler<
    unknown,
    { message: string; ventasVsGastos?: VentasVsGastos[] },
    unknown,
    QueryMes
> = async (req, res, next) => {
    try {
        const inicio = parseMes(req.query.mes);

        if (!inicio) return res.status(400).json({
            message: "Mes inválido. Formato esperado: YYYY-MM."
        });

        const periodos = lastMonths(inicio);
        const meses = await resumenPorMes(periodos[0], addMonths(inicio, 1));

        const ventasVsGastos: VentasVsGastos[] = periodos.map((fecha) => {
            const r = meses.get(monthKey(fecha)) ?? resumenVacio();
            return {
                anio_mes: monthKey(fecha),
                total_ventas: round2(r.ventasConIva),
                total_gastos: round2(r.gastos)
            };
        });

        return res.status(200).json({
            message: "Ventas y gastos obtenidos exitosamente",
            ventasVsGastos
        });
    } catch (error) {
        next(error);
    }
};
