import { Prisma } from "@prisma/client";
import { RequestHandler } from "express";
import { prisma } from "../../../config/prisma.js";

type GetExpensesByID = Prisma.ExpenseGetPayload<
    {
        select: {
            id: true,
            concept: true,
            amount: true,
            date: true,
            userId: true,
            cashRegisterId: true,

            cashRegister: {
                select: {
                    id: true,
                    name: true
                }
            },

            user: {
                select: {
                    identityDocument: true,
                    firstName: true,
                    lastName: true
                }
            }
        }
    }
>;
type GetExpenses = Prisma.ExpenseGetPayload<
    {
        select: {
            id: true,
            concept: true,
            amount: true,
            date: true,
            userId: true,
            cashRegisterId: true,

        }
    }

>;

export const getExpenses: RequestHandler<
    { idExpenses?: string; },
    { message: string, Expenses?: GetExpenses[] | GetExpensesByID }

> = async (req, res, next) => {
    try {
        const { idExpenses } = req.params;

        if (idExpenses) {
            const expenses = await prisma.expense.findUnique({
                select: {
                    id: true,
                    concept: true,
                    amount: true,
                    date: true,
                    userId: true,
                    cashRegisterId: true,

                    cashRegister: {
                        select: {
                            id: true,
                            name: true
                        }
                    },

                    user: {
                        select: {
                            identityDocument: true,
                            firstName: true,
                            lastName: true
                        }
                    }

                },

                where: {
                    id: Number(idExpenses)

                }

            });
            if (!expenses) {
                return res.status(404).json({
                    message: "No se ha encontrado el gasto"
                });
            }
            return res.status(200).json({
                message: "Gasto encontrado",
                Expenses: expenses
            });


        }

        const expenses = await prisma.expense.findMany({
            select: {
                id: true,
                concept: true,
                amount: true,
                date: true,
                userId: true,
                cashRegisterId: true,

            },
        });
        return res.status(200).json({
            message: "Gastos obtenidos exitosamente",
            Expenses: expenses
        });

    } catch (error) {
        next(error);
    }
};

export const createExpenses: RequestHandler<
    unknown,
    { message: string },
    {
        concept: string,
        amount: number,
        date: string,
        cashRegisterId: number
    }

> = async (req, res, next) => {
    try {
        const expenseInfo = req.body;

        if (
            !expenseInfo ||
            !expenseInfo.concept ||
            !expenseInfo.amount ||
            !expenseInfo.date ||
            !expenseInfo.cashRegisterId

        ) {
            return res.status(400).json({
                message: "Campos por llenar"
            });
        }

        await prisma.expense.create({
            data: {
                ...expenseInfo,
                userId: "1017100001",
                date: new Date(expenseInfo.date)
            }
        });
        res.status(201).json({
            message: "Gasto registrado exitosamente"
        });
    } catch (error) {
        next(error);
    }
};

export const updateExpenses: RequestHandler<
    { idExpenses: string },
    { message: string },
    Partial<{
        concept: string,
        amount: number,
        date: string,
        userId: string,
        cashRegisterId: number
    }>
> = async (req, res, next) => {
    try {
        const { idExpenses } = req.params;
        const expenseInfo = req.body;

        if (
            !idExpenses ||
            !expenseInfo ||
            Object.keys(expenseInfo).length === 0
        ) {
            return res.status(400).json({
                message: "Campos por llenar"
            });
        }

        const expense = await prisma.expense.findUnique({
            where: {
                id: Number(idExpenses)
            }
        });

        if (!expense) {
            return res.status(404).json({
                message: "Gasto no encontrado"
            });
        }

        await prisma.expense.update({
            where: {
                id: Number(idExpenses)
            },
            data: {
                ...expenseInfo,
                ...(expenseInfo.date
                    ? { date: new Date(expenseInfo.date) }
                    : {})
            }
        });

        return res.status(200).json({
            message: "Gasto actualizado exitosamente"
        });

    } catch (error) {
        next(error);
    }
};

export const deleteExpenses: RequestHandler<
    { idExpenses: string },
    { message: string }
> = async (req, res, next) => {
    try {
        const { idExpenses } = req.params;

        const expense = await prisma.expense.findUnique({
            where: {
                id: Number(idExpenses)
            }
        });

        if (!expense) {
            return res.status(404).json({
                message: "Gasto no encontrado"
            });
        }

        await prisma.expense.delete({
            where: {
                id: Number(idExpenses)
            }
        });

        return res.status(200).json({
            message: "Gasto eliminado exitosamente"
        });

    } catch (error) {
        next(error);
    }
};