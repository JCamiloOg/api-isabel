
import { Prisma, Supplier } from "@prisma/client";
import { RequestHandler } from "express";
import { prisma } from "../../../config/prisma.js";

type GetSuppliersByID = Prisma.SupplierGetPayload<
    {
        select: {
            documentTypeId: true,
            document: true,
            supplierType: true,
            businessName: true,
            isImported: true,
            phone: true,
            email: true,
            address: true,
            status: true,
            categories: {
                select: {
                    supplierCategoryId: true,
                    supplierCategory: {
                        select: {
                            name: true,
                            description: true
                        }
                    }
                }
            }
        }
    }
>;

type GetSuppliers = Prisma.SupplierGetPayload<
    {
        select: {
            documentTypeId: true,
            document: true,
            supplierType: true,
            businessName: true,
            isImported: true,
            phone: true,
            email: true,
            address: true,
            status: true
        },
    }
>;
// Obtener proveedor
export const getSuppliers: RequestHandler<
    { idSupplier?: string; },
    { message: string, Supplier?: GetSuppliers[] | GetSuppliersByID }
> = async (req, res, next) => {
    try {
        const { idSupplier } = req.params;

        if (idSupplier) {
            const supplier = await prisma.supplier.findUnique({
                select: {
                    documentTypeId: true,
                    document: true,
                    supplierType: true,
                    businessName: true,
                    isImported: true,
                    phone: true,
                    email: true,
                    address: true,
                    status: true,
                    categories: {
                        select: {
                            supplierCategoryId: true,
                            supplierCategory: {
                                select: {
                                    name: true,
                                    description: true
                                }
                            }
                        }
                    }
                },
                where: {
                    document: idSupplier
                }
            });

            if (!supplier) {
                return res.status(404).json({
                    message: "No se ha encontrado el proveedor"
                });
            }

            return res.status(200).json({
                message: "Proveedor encontrado exitosamente",
                Supplier: supplier
            });
        }

        const suppliers = await prisma.supplier.findMany({
            select: {
                documentTypeId: true,
                document: true,
                supplierType: true,
                businessName: true,
                isImported: true,
                phone: true,
                email: true,
                address: true,
                status: true,
            },
        });

        return res.status(200).json({
            message: "Proveedores obtenidos exitosamente",
            Supplier: suppliers
        });

    } catch (error) {
        next(error);
    }
};

//Crear proveedor
export const createSupplier: RequestHandler<
    unknown,
    { message: string },
    {
        supplierInfo: Omit<Supplier, 'status'>,
        categories: number[]
    }
> = async (req, res, next) => {
    try {
        const { supplierInfo, categories } = req.body;

        if (!supplierInfo || !categories || categories.length === 0) return res.status(400).json({
            message: "Campos por llenar"
        });
        await prisma.$transaction(async (tx) => {
            const insertedSupplier = await tx.supplier.create({
                data: {
                    ...supplierInfo,
                }
            });

            await tx.supplierCategoryAssignment.createMany({
                data: categories.map((e) => ({
                    supplierId: insertedSupplier.document,
                    supplierCategoryId: e
                }))
            });
        });

        return res.status(201).json({
            message: "Proveedor registrado exitosamente"
        });
    } catch (error) {
        next(error);
    }
};

export const updateSupplier: RequestHandler<
    { idSupplier: string },
    { message: string },
    { supplierInfo: Omit<Prisma.SupplierUncheckedUpdateInput, "document"> }

> = async (req, res, next) => {
    try {
        const { idSupplier } = req.params;
        const { supplierInfo } = req.body;

        if (!idSupplier || !supplierInfo ||
            Object.keys(supplierInfo).length === 0) {
            return res.status(400).json({
                message: "Campos por llenar"
            });

        }

        await prisma.supplier.update({
            where: {
                document: idSupplier
            },
            data: supplierInfo
        });

        return res.status(200).json({
            message: "Proveedor actualizado exitosamente"
        });
    } catch (error) {
        next(error);
    };
};

export const deleteSupplier: RequestHandler<
    { idSupplier: string },
    { message: string }

> = async (req, res, next) => {
    try {
        const { idSupplier } = req.params;
        const supplier = await prisma.supplier.findUnique({
            where: {
                document: idSupplier
            }

        });
        if (!supplier) {
            return res.status(404).json({
                message: "Proveedor no encontrado"
            });
        }
        await prisma.supplier.update({
            where: {
                document: idSupplier
            },
            data: {
                status: "Inactive"
            }
        });

        return res.status(200).json({
            message: "Proveedor eliminado exitosamente"
        });
    } catch (error) {
        next(error);
    }
};


