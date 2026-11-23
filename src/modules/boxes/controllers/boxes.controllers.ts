
import { Prisma } from "@prisma/client";
import { RequestHandler } from "express";
import { prisma } from "../../../config/prisma.js";

// =====================================================
// TIPOS PARA CONSULTAR CAJAS
// =====================================================

type GetBoxesbyID = Prisma.CashRegisterGetPayload<{
    select: {
        id: true,
        name: true,
        registerType: true,
        currentBalance: true,
        details: true,
        status: true,

        purchases: {
            select: {
                id: true,
                supplierId: true,
                orderDate: true,
                status: true,
                deliveryDate: true,
                vat: true
            }
        },

        payments: {
            select: {
                id: true,
                saleId: true,
                userId: true,
                paymentMethodId: true,
                amount: true,
                paymentDate: true,
                receipt: true,
                notes: true
            }
        },

        expenses: {
            select: {
                id: true,
                concept: true,
                amount: true,
                date: true,
                userId: true
            }
        }
    }
}>;

type GetBoxes = Prisma.CashRegisterGetPayload<{
    select: {
        id: true,
        name: true,
        registerType: true,
        currentBalance: true,
        details: true,
        status: true
    }
}>;


// =====================================================
// GET: CONSULTAR CAJAS
// =====================================================

export const getBoxes: RequestHandler<
    { idBox?: string },
    { message: string, Boxes?: GetBoxes[] | GetBoxesbyID }
> = async (req, res, next) => {
    try {
        const { idBox } = req.params;

        if (idBox) {

            const id = Number(idBox);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    message: "Identificador de caja no válido"
                });
            }

            const boxes = await prisma.cashRegister.findUnique({
                select: {
                    id: true,
                    name: true,
                    registerType: true,
                    currentBalance: true,
                    details: true,
                    status: true,

                    purchases: {
                        select: {
                            id: true,
                            supplierId: true,
                            orderDate: true,
                            status: true,
                            deliveryDate: true,
                            vat: true
                        }
                    },

                    payments: {
                        select: {
                            id: true,
                            saleId: true,
                            userId: true,
                            paymentMethodId: true,
                            amount: true,
                            paymentDate: true,
                            receipt: true,
                            notes: true
                        }
                    },

                    expenses: {
                        select: {
                            id: true,
                            concept: true,
                            amount: true,
                            date: true,
                            userId: true
                        }
                    }
                },

                where: {
                    id
                }
            });

            if (!boxes) {
                return res.status(404).json({
                    message: "No se ha encontrado la caja"
                });
            }

            return res.status(200).json({
                message: "Caja encontrada exitosamente",
                Boxes: boxes
            });
        }

        const boxes = await prisma.cashRegister.findMany({
            select: {
                id: true,
                name: true,
                registerType: true,
                currentBalance: true,
                details: true,
                status: true
            }
        });

        return res.status(200).json({
            message: "Cajas obtenidas exitosamente",
            Boxes: boxes
        });

    } catch (error) {
        next(error);
    }
};


// =====================================================
// POST: CREAR CAJA
// =====================================================

type BoxInfo = {
    name: string,
    registerType: string,
    currentBalance?: number,
    details: string,
    status?: boolean
};

export const createBoxes: RequestHandler<
    unknown,
    { message: string },
    BoxInfo
> = async (req, res, next) => {
    try {
        const boxInfo = req.body;

        const {
            name,
            registerType,
            currentBalance,
            details,
            status
        } = boxInfo;

        if (
            !name ||
            !registerType ||
            !details
        ) {
            return res.status(400).json({
                message: "Campos por llenar"
            });
        }

        if (
            currentBalance !== undefined &&
            (!Number.isFinite(currentBalance) || currentBalance < 0)
        ) {
            return res.status(400).json({
                message: "El saldo no es válido"
            });
        }

        if (
            status !== undefined &&
            typeof status !== "boolean"
        ) {
            return res.status(400).json({
                message: "El estado no es válido"
            });
        }

        await prisma.cashRegister.create({
            data: {
                name,
                registerType,
                details,

                ...(currentBalance !== undefined
                    ? { currentBalance: new Prisma.Decimal(currentBalance) }
                    : {}),

                ...(status !== undefined
                    ? { status }
                    : {})
            }
        });

        return res.status(201).json({
            message: "Caja registrada exitosamente"
        });

    } catch (error) {
        next(error);
    }
};


// =====================================================
// PUT: ACTUALIZAR CAJA
// =====================================================

export const updateBoxes: RequestHandler<
    { idBox: string },
    { message: string },
    Partial<BoxInfo>
> = async (req, res, next) => {
    try {
        const { idBox } = req.params;
        const boxInfo = req.body;

        if (
            !idBox ||
            !boxInfo ||
            Object.keys(boxInfo).length === 0
        ) {
            return res.status(400).json({
                message: "Campos por llenar"
            });
        }

        const id = Number(idBox);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Identificador de caja no válido"
            });
        }

        const box = await prisma.cashRegister.findUnique({
            where: {
                id
            }
        });

        if (!box) {
            return res.status(404).json({
                message: "Caja no encontrada"
            });
        }

        if (
            boxInfo.name !== undefined &&
            !boxInfo.name.trim()
        ) {
            return res.status(400).json({
                message: "El nombre no puede estar vacío"
            });
        }

        if (
            boxInfo.registerType !== undefined &&
            !boxInfo.registerType.trim()
        ) {
            return res.status(400).json({
                message: "El tipo de caja no puede estar vacío"
            });
        }

        if (
            boxInfo.details !== undefined &&
            !boxInfo.details.trim()
        ) {
            return res.status(400).json({
                message: "Los detalles no pueden estar vacíos"
            });
        }

        if (
            boxInfo.currentBalance !== undefined &&
            (!Number.isFinite(boxInfo.currentBalance) ||
                boxInfo.currentBalance < 0)
        ) {
            return res.status(400).json({
                message: "El saldo no es válido"
            });
        }

        if (
            boxInfo.status !== undefined &&
            typeof boxInfo.status !== "boolean"
        ) {
            return res.status(400).json({
                message: "El estado no es válido"
            });
        }

        const data: Prisma.CashRegisterUpdateInput = {};

        if (boxInfo.name !== undefined) {
            data.name = boxInfo.name;
        }

        if (boxInfo.registerType !== undefined) {
            data.registerType = boxInfo.registerType;
        }

        if (boxInfo.details !== undefined) {
            data.details = boxInfo.details;
        }

        if (boxInfo.currentBalance !== undefined) {
            data.currentBalance = new Prisma.Decimal(
                boxInfo.currentBalance
            );
        }

        if (boxInfo.status !== undefined) {
            data.status = boxInfo.status;
        }

        await prisma.cashRegister.update({
            where: {
                id
            },
            data
        });

        return res.status(200).json({
            message: "Caja actualizada exitosamente"
        });

    } catch (error) {
        next(error);
    }
};


// =====================================================
// DELETE: DESACTIVAR CAJA
// =====================================================

export const deleteBoxes: RequestHandler<
    { idBox: string },
    { message: string }
> = async (req, res, next) => {
    try {
        const { idBox } = req.params;

        const id = Number(idBox);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Identificador de caja no válido"
            });
        }

        const box = await prisma.cashRegister.findUnique({
            where: {
                id
            }
        });

        if (!box) {
            return res.status(404).json({
                message: "Caja no encontrada"
            });
        }

        if (!box.status) {
            return res.status(400).json({
                message: "La caja ya se encuentra inactiva"
            });
        }

        await prisma.cashRegister.update({
            where: {
                id
            },
            data: {
                status: false
            }
        });

        return res.status(200).json({
            message: "Caja desactivada exitosamente"
        });

    } catch (error) {
        next(error);
    }
};
