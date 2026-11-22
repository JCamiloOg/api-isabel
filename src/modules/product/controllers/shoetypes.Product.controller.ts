import { RequestHandler } from "express";
import { prisma } from "../../../config/prisma.js";

export interface CreateShoeTypeDTO {
    name: string;
}

export interface UpdateShoeTypeDTO {
    name: string;
}

export const getShoeTypes: RequestHandler = async (req, res, next) => {
    try {
        const { search } = req.query;

        const whereClause: {
            name?: { contains: string; mode: "insensitive" };
        } = {};

        if (typeof search === "string" && search.trim()) {
            whereClause.name = {
                contains: search.trim(),
                mode: "insensitive"
            };
        }

        const shoeTypes = await prisma.shoeType.findMany({
            where: whereClause,
            include: {
                _count: {
                    select: { products: true }
                }
            },
            orderBy: {
                id: "asc"
            }
        });

        const lastShoeType = await prisma.shoeType.findFirst({
            orderBy: { id: "desc" },
            select: { id: true }
        });
        const nextId = (lastShoeType?.id ?? 0) + 1;

        const formattedShoeTypes = shoeTypes.map((type) => ({
            id: type.id,
            name: type.name,
            productsCount: type._count.products
        }));

        return res.status(200).json({
            message: "Tipos de zapato obtenidos exitosamente",
            nextId,
            shoeTypes: formattedShoeTypes
        });
    } catch (error) {
        next(error);
    }
};

export const getNextShoeTypeId: RequestHandler = async (_req, res, next) => {
    try {
        const lastShoeType = await prisma.shoeType.findFirst({
            orderBy: { id: "desc" },
            select: { id: true }
        });
        const nextId = (lastShoeType?.id ?? 0) + 1;

        return res.status(200).json({
            message: "Próximo ID obtenido exitosamente",
            nextId
        });
    } catch (error) {
        next(error);
    }
};

export const getShoeTypeById: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "El identificador del tipo de zapato debe ser un número entero válido."
            });
        }

        const shoeType = await prisma.shoeType.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { products: true }
                }
            }
        });

        if (!shoeType) {
            return res.status(404).json({
                message: "Tipo de zapato no encontrado."
            });
        }

        return res.status(200).json({
            message: "Tipo de zapato obtenido exitosamente",
            shoeType: {
                id: shoeType.id,
                name: shoeType.name,
                productsCount: shoeType._count.products
            }
        });
    } catch (error) {
        next(error);
    }
};

export const createShoeType: RequestHandler<
    {},
    unknown,
    CreateShoeTypeDTO
> = async (req, res, next) => {
    try {
        const { name } = req.body;

        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                message: "El nombre del tipo de zapato es obligatorio."
            });
        }

        const trimmedName = name.trim();

        if (trimmedName.length > 100) {
            return res.status(400).json({
                message: "El nombre del tipo de zapato no puede superar los 100 caracteres."
            });
        }

        const existingShoeType = await prisma.shoeType.findFirst({
            where: {
                name: {
                    equals: trimmedName,
                    mode: "insensitive"
                }
            }
        });

        const newShoeType = await prisma.shoeType.create({
            data: {
                name: trimmedName
            }
        });

        return res.status(201).json({
            message: "Tipo de zapato creado exitosamente",
            shoeType: {
                id: newShoeType.id,
                name: newShoeType.name
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateShoeType: RequestHandler<
    { id: string },
    unknown,
    UpdateShoeTypeDTO
> = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "El identificador del tipo de zapato debe ser un número entero válido."
            });
        }

        const existingShoeType = await prisma.shoeType.findUnique({
            where: { id }
        });

        if (!existingShoeType) {
            return res.status(404).json({
                message: "Tipo de zapato no encontrado."
            });
        }

        const { name } = req.body;

        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                message: "El nombre del tipo de zapato es obligatorio."
            });
        }

        const trimmedName = name.trim();

        if (trimmedName.length > 100) {
            return res.status(400).json({
                message: "El nombre del tipo de zapato no puede superar los 100 caracteres."
            });
        }

        if (trimmedName.toLowerCase() !== existingShoeType.name.toLowerCase()) {
            const nameTaken = await prisma.shoeType.findFirst({
                where: {
                    name: {
                        equals: trimmedName,
                        mode: "insensitive"
                    },
                    NOT: { id }
                }
            });

        }

        const updatedShoeType = await prisma.shoeType.update({
            where: { id },
            data: {
                name: trimmedName
            }
        });

        return res.status(200).json({
            message: "Tipo de zapato actualizado exitosamente",
            shoeType: {
                id: updatedShoeType.id,
                name: updatedShoeType.name
            }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteShoeType: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "El identificador del tipo de zapato debe ser un número entero válido."
            });
        }

        const existingShoeType = await prisma.shoeType.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { products: true }
                }
            }
        });

        if (!existingShoeType) {
            return res.status(404).json({
                message: "Tipo de zapato no encontrado."
            });
        }

        if (existingShoeType._count.products > 0) {
            return res.status(400).json({
                message: "No es posible eliminar el tipo de zapato porque tiene productos asociados en el catálogo."
            });
        }

        await prisma.shoeType.delete({
            where: { id }
        });

        return res.status(200).json({
            message: "Tipo de zapato eliminado exitosamente"
        });
    } catch (error) {
        next(error);
    }
};
