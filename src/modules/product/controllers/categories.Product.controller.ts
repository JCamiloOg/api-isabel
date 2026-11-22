import { RequestHandler } from "express";
import { prisma } from "../../../config/prisma.js";

export interface CreateProductCategoryDTO {
    name: string;
    description: string;
}

export interface UpdateProductCategoryDTO {
    name?: string;
    description?: string;
}

export const getCategories: RequestHandler = async (req, res, next) => {
    try {
        const { search } = req.query;

        const whereClause: {
            OR?: Array<
                | { name: { contains: string; mode: "insensitive" } }
                | { description: { contains: string; mode: "insensitive" } }
            >;
        } = {};

        if (typeof search === "string" && search.trim()) {
            const query = search.trim();
            whereClause.OR = [
                { name: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } }
            ];
        }

        const categories = await prisma.productCategory.findMany({
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

        const lastCategory = await prisma.productCategory.findFirst({
            orderBy: { id: "desc" },
            select: { id: true }
        });
        const nextId = (lastCategory?.id ?? 0) + 1;

        const formattedCategories = categories.map((category) => ({
            id: category.id,
            name: category.name,
            description: category.description,
            productsCount: category._count.products
        }));

        return res.status(200).json({
            message: "Categorías obtenidas exitosamente",
            nextId,
            categories: formattedCategories
        });
    } catch (error) {
        next(error);
    }
};

export const getNextCategoryId: RequestHandler = async (_req, res, next) => {
    try {
        const lastCategory = await prisma.productCategory.findFirst({
            orderBy: { id: "desc" },
            select: { id: true }
        });
        const nextId = (lastCategory?.id ?? 0) + 1;

        return res.status(200).json({
            message: "Próximo ID obtenido exitosamente",
            nextId
        });
    } catch (error) {
        next(error);
    }
};

export const getCategoryById: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "El identificador de la categoría debe ser un número entero válido."
            });
        }

        const category = await prisma.productCategory.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { products: true }
                }
            }
        });

        if (!category) {
            return res.status(404).json({
                message: "Categoría no encontrada."
            });
        }

        return res.status(200).json({
            message: "Categoría obtenida exitosamente",
            category: {
                id: category.id,
                name: category.name,
                description: category.description,
                productsCount: category._count.products
            }
        });
    } catch (error) {
        next(error);
    }
};

export const createCategory: RequestHandler<
    {},
    unknown,
    CreateProductCategoryDTO
> = async (req, res, next) => {
    try {
        const { name, description } = req.body;

        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                message: "El nombre de la categoría es obligatorio."
            });
        }

        if (!description || typeof description !== "string" || !description.trim()) {
            return res.status(400).json({
                message: "La descripción de la categoría es obligatoria."
            });
        }

        const trimmedName = name.trim();
        const trimmedDescription = description.trim();

        if (trimmedName.length > 80) {
            return res.status(400).json({
                message: "El nombre de la categoría no puede superar los 80 caracteres."
            });
        }

        if (trimmedDescription.length > 255) {
            return res.status(400).json({
                message: "La descripción de la categoría no puede superar los 255 caracteres."
            });
        }

        const existingCategory = await prisma.productCategory.findFirst({
            where: {
                name: {
                    equals: trimmedName,
                    mode: "insensitive"
                }
            }
        });

        if (existingCategory) {
            return res.status(409).json({
                message: "Ya existe una categoría registrada con este nombre."
            });
        }

        const newCategory = await prisma.productCategory.create({
            data: {
                name: trimmedName,
                description: trimmedDescription
            }
        });

        return res.status(201).json({
            message: "Categoría creada exitosamente",
            category: {
                id: newCategory.id,
                name: newCategory.name,
                description: newCategory.description
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateCategory: RequestHandler<
    { id: string },
    unknown,
    UpdateProductCategoryDTO
> = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "El identificador de la categoría debe ser un número entero válido."
            });
        }

        const existingCategory = await prisma.productCategory.findUnique({
            where: { id }
        });

        if (!existingCategory) {
            return res.status(404).json({
                message: "Categoría no encontrada."
            });
        }

        const { name, description } = req.body;
        const updateData: { name?: string; description?: string } = {};

        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({
                    message: "El nombre de la categoría no puede estar vacío."
                });
            }

            const trimmedName = name.trim();

            if (trimmedName.length > 80) {
                return res.status(400).json({
                    message: "El nombre de la categoría no puede superar los 80 caracteres."
                });
            }

            if (trimmedName.toLowerCase() !== existingCategory.name.toLowerCase()) {
                const nameTaken = await prisma.productCategory.findFirst({
                    where: {
                        name: {
                            equals: trimmedName,
                            mode: "insensitive"
                        },
                        NOT: { id }
                    }
                });

                if (nameTaken) {
                    return res.status(409).json({
                        message: "Ya existe otra categoría con este nombre."
                    });
                }
            }

            updateData.name = trimmedName;
        }

        if (description !== undefined) {
            if (typeof description !== "string" || !description.trim()) {
                return res.status(400).json({
                    message: "La descripción de la categoría no puede estar vacía."
                });
            }

            const trimmedDescription = description.trim();

            if (trimmedDescription.length > 255) {
                return res.status(400).json({
                    message: "La descripción de la categoría no puede superar los 255 caracteres."
                });
            }

            updateData.description = trimmedDescription;
        }

        const updatedCategory = await prisma.productCategory.update({
            where: { id },
            data: updateData
        });

        return res.status(200).json({
            message: "Categoría actualizada exitosamente",
            category: {
                id: updatedCategory.id,
                name: updatedCategory.name,
                description: updatedCategory.description
            }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteCategory: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "El identificador de la categoría debe ser un número entero válido."
            });
        }

        const existingCategory = await prisma.productCategory.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { products: true }
                }
            }
        });

        if (!existingCategory) {
            return res.status(404).json({
                message: "Categoría no encontrada."
            });
        }

        if (existingCategory._count.products > 0) {
            return res.status(400).json({
                message: "No es posible eliminar la categoría porque tiene productos asociados en el catálogo."
            });
        }

        await prisma.productCategory.delete({
            where: { id }
        });

        return res.status(200).json({
            message: "Categoría eliminada exitosamente"
        });
    } catch (error) {
        next(error);
    }
};
