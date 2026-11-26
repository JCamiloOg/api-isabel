import { Prisma, SupplierCategory } from "@prisma/client";
import { RequestHandler } from "express";
import { prisma } from "../../../config/prisma.js";

type GetSupplierCategory = Prisma.SupplierCategoryGetPayload<{
    select: {
        id: true,
        name: true,
        description: true
    }
}>;

// Obtener categorías con sus proveedores
// type GetSupplierCategoryWithSuppliers =
//     Prisma.SupplierCategoryGetPayload<{
//         select: {
//             id: true,
//             name: true,
//             description: true,
//             suppliers: {
//                 select: {
//                     supplier: {
//                         select: {
//                             document: true,
//                             businessName: true,
//                             email: true,
//                             phone: true,
//                             status: true
//                         }
//                     }
//                 }
//             }
//         }
//     }>;

type CreateSupplierCategoryDTO = {
    name: string;
    description: string;
};

type UpdateSupplierCategoryDTO = Partial<CreateSupplierCategoryDTO>;



export const createSupplierCategory: RequestHandler<
    unknown,
    { message: string; suppliersCategory?: GetSupplierCategory },
    CreateSupplierCategoryDTO
> = async (req, res, next) => {
    try {
        const { name, description } = req.body;

        const suppliersCategory = await prisma.supplierCategory.create({
            data: {
                name,
                description
            }
        });

        return res.status(201).json({
            message: "Categoría creada exitosamente",
            suppliersCategory
        });

    } catch (error) {
        next(error);
    }
};


export const updateSupplierCategory: RequestHandler<
    { idSupplierCategory: string },
    { message: string; suppliersCategory?: GetSupplierCategory },
    UpdateSupplierCategoryDTO
> = async (req, res, next) => {
    try {
        const id = Number(req.params.idSupplierCategory);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Identificador inválido."
            });
        }

        const suppliersCategory = await prisma.supplierCategory.update({
            where: { id },
            data: req.body
        });

        return res.status(200).json({
            message: "Categoría actualizada exitosamente",
            suppliersCategory
        });

    } catch (error) {
        next(error);
    }
};

export const deleteSupplierCategory: RequestHandler<
    { idSupplierCategory: string },
    { message: string }
> = async (req, res, next) => {
    try {
        const id = Number(req.params.idSupplierCategory);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Identificador inválido."
            });
        }

        const isRelation = await prisma.supplierCategoryAssignment.findMany({
            where: {
                supplierCategoryId: id
            }
        });

        if (isRelation.length > 0) {
            return res.status(400).json({
                message: "No se puede eliminar la categoría porque tiene proveedores asociados."
            });
        }

        await prisma.supplierCategory.delete({
            where: { id }
        });

        return res.status(200).json({
            message: "Categoría eliminada exitosamente"
        });

    } catch (error) {
        next(error);
    }
};

export const getSuppliersCategory: RequestHandler<
    { idSupplierCategory?: string },
    { message: string; suppliersCategory?: SupplierCategory | SupplierCategory[] }
> = async (req, res, next) => {
    try {
        const { idSupplierCategory } = req.params;

        if (idSupplierCategory) {
            const id = Number(idSupplierCategory);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    message: "El identificador de la categoria debe ser un numero entero."
                });
            }

            const suppliersCategory = await prisma.supplierCategory.findUnique({
                where: { id },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    suppliers: {
                        select: {
                            supplier: {
                                select: {
                                    document: true,
                                    businessName: true,
                                    email: true,
                                    phone: true,
                                    status: true
                                }
                            }
                        }
                    }
                }
            });

            if (!suppliersCategory) return res.status(404).json({ message: "No se ha encontrado la categoria del proveedor." });

            return res.status(200).json({ message: "Categoria obtenida exitosamente", suppliersCategory: suppliersCategory });
        }

        const suppliersCategory = await prisma.supplierCategory.findMany({
            select: {
                id: true,
                name: true,
                description: true,
                suppliers: {
                    select: {
                        supplier: {
                            select: {
                                document: true,
                                businessName: true,
                                email: true,
                                phone: true,
                                status: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                name: "asc"
            }
        });

        return res.status(200).json({
            message: "Categorias obtenidas exitosamente",
            suppliersCategory
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