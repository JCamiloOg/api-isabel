import { Prisma, Purchase } from "@prisma/client";
import { RequestHandler } from "express";
import { prisma } from "../../../config/prisma.js";


type GetShoppingByID = Prisma.PurchaseGetPayload<
    {
        include: {
            purchaseDetails: true
        },

    }
>;

export const getShoppings: RequestHandler<
    { idShopping?: string; },
    { message: string, shoppings?: Purchase[] | GetShoppingByID }
> = async (req, res, next) => {
    try {
        const { idShopping } = req.params;

        if (idShopping) {
            const shopping = await prisma.purchase.findUnique({
                include: {
                    purchaseDetails: true
                },
                where: { id: idShopping }
            });

            if (!shopping) return res.status(404).json({ message: "No se ha encontrado la compra." });

            return res.status(200).json({ message: "Compra obtenida exitosamente", shoppings: shopping });
        }

        const shoppings = await prisma.purchase.findMany({

        });

        return res.status(200).json({
            message: "Compras obtenidas exitosamente",
            shoppings: shoppings
        });

    } catch (error) {
        next(error);
    }
};



export const createOrder: RequestHandler<
    unknown,
    { message: string }
> = async (req, res, next) => {
    try {
        // 
    } catch (error) {
        next(error);
    }
};