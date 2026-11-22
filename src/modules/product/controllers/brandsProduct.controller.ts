import { RequestHandler } from "express";
import { prisma } from "../../../config/prisma.js";

export interface CreateBrandDTO {
    name: string;
    status?: string | boolean;
}

export interface UpdateBrandDTO {
    name?: string;
    status?: string | boolean;
}

const normalizeStatus = (status: string | boolean | undefined): string => {
    if (status === undefined || status === null) return "Active";
    if (typeof status === "boolean") return status ? "Active" : "Inactive";
    const lower = status.trim().toLowerCase();
    if (lower === "activo" || lower === "active" || lower === "true") return "Active";
    if (lower === "inactivo" || lower === "inactive" || lower === "false") return "Inactive";
    return status;
};

export const getBrands: RequestHandler = async (req, res, next) => {
    try {
        const { search, status } = req.query;

        const whereClause: {
            name?: { contains: string; mode: "insensitive" };
            status?: string;
        } = {};

        if (typeof search === "string" && search.trim()) {
            whereClause.name = {
                contains: search.trim(),
                mode: "insensitive"
            };
        }

        if (typeof status === "string" && status.trim()) {
            whereClause.status = normalizeStatus(status);
        }

        const brands = await prisma.brand.findMany({
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

        const lastBrand = await prisma.brand.findFirst({
            orderBy: { id: "desc" },
            select: { id: true }
        });
        const nextId = (lastBrand?.id ?? 0) + 1;

        const formattedBrands = brands.map((brand) => ({
            id: brand.id,
            name: brand.name,
            status: brand.status,
            isActive: brand.status === "Active" || brand.status === "Activo",
            productsCount: brand._count.products
        }));

        return res.status(200).json({
            message: "Marcas obtenidas exitosamente",
            nextId,
            brands: formattedBrands
        });
    } catch (error) {
        next(error);
    }
};

export const getNextBrandId: RequestHandler = async (_req, res, next) => {
    try {
        const lastBrand = await prisma.brand.findFirst({
            orderBy: { id: "desc" },
            select: { id: true }
        });
        const nextId = (lastBrand?.id ?? 0) + 1;

        return res.status(200).json({
            message: "Próximo ID obtenido exitosamente",
            nextId
        });
    } catch (error) {
        next(error);
    }
};

export const getBrandById: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "El identificador de la marca debe ser un número entero válido."
            });
        }

        const brand = await prisma.brand.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { products: true }
                }
            }
        });

        if (!brand) {
            return res.status(404).json({
                message: "Marca no encontrada."
            });
        }

        return res.status(200).json({
            message: "Marca obtenida exitosamente",
            brand: {
                id: brand.id,
                name: brand.name,
                status: brand.status,
                isActive: brand.status === "Active" || brand.status === "Activo",
                productsCount: brand._count.products
            }
        });
    } catch (error) {
        next(error);
    }
};

export const createBrand: RequestHandler<
    {},
    unknown,
    CreateBrandDTO
> = async (req, res, next) => {
    try {
        const { name, status } = req.body;

        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                message: "El nombre de la marca es obligatorio."
            });
        }

        const trimmedName = name.trim();

        if (trimmedName.length > 80) {
            return res.status(400).json({
                message: "El nombre de la marca no puede superar los 80 caracteres."
            });
        }

        const existingBrand = await prisma.brand.findFirst({
            where: {
                name: {
                    equals: trimmedName,
                    mode: "insensitive"
                }
            }
        });

        if (existingBrand) {
            return res.status(409).json({
                message: "Ya existe una marca registrada con este nombre."
            });
        }

        const newBrand = await prisma.brand.create({
            data: {
                name: trimmedName,
                status: normalizeStatus(status)
            }
        });

        return res.status(201).json({
            message: "Marca creada exitosamente",
            brand: {
                id: newBrand.id,
                name: newBrand.name,
                status: newBrand.status,
                isActive: newBrand.status === "Active" || newBrand.status === "Activo"
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateBrand: RequestHandler<
    { id: string },
    unknown,
    UpdateBrandDTO
> = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "El identificador de la marca debe ser un número entero válido."
            });
        }

        const existingBrand = await prisma.brand.findUnique({
            where: { id }
        });

        if (!existingBrand) {
            return res.status(404).json({
                message: "Marca no encontrada."
            });
        }

        const { name, status } = req.body;
        const updateData: { name?: string; status?: string } = {};

        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({
                    message: "El nombre de la marca no puede estar vacío."
                });
            }

            const trimmedName = name.trim();

            if (trimmedName.length > 80) {
                return res.status(400).json({
                    message: "El nombre de la marca no puede superar los 80 caracteres."
                });
            }

            if (trimmedName.toLowerCase() !== existingBrand.name.toLowerCase()) {
                const nameTaken = await prisma.brand.findFirst({
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
                        message: "Ya existe otra marca con este nombre."
                    });
                }
            }

            updateData.name = trimmedName;
        }

        if (status !== undefined) {
            updateData.status = normalizeStatus(status);
        }

        const updatedBrand = await prisma.brand.update({
            where: { id },
            data: updateData
        });

        return res.status(200).json({
            message: "Marca actualizada exitosamente",
            brand: {
                id: updatedBrand.id,
                name: updatedBrand.name,
                status: updatedBrand.status,
                isActive: updatedBrand.status === "Active" || updatedBrand.status === "Activo"
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateBrandStatus: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "El identificador de la marca debe ser un número entero válido."
            });
        }

        const existingBrand = await prisma.brand.findUnique({
            where: { id }
        });

        if (!existingBrand) {
            return res.status(404).json({
                message: "Marca no encontrada."
            });
        }

        const isCurrentlyActive = existingBrand.status === "Active" || existingBrand.status === "Activo";
        const newStatus = isCurrentlyActive ? "Inactive" : "Active";

        const updatedBrand = await prisma.brand.update({
            where: { id },
            data: { status: newStatus }
        });

        return res.status(200).json({
            message: "Estado de la marca actualizado exitosamente",
            brand: {
                id: updatedBrand.id,
                name: updatedBrand.name,
                status: updatedBrand.status,
                isActive: updatedBrand.status === "Active" || updatedBrand.status === "Activo"
            }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteBrand: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "El identificador de la marca debe ser un número entero válido."
            });
        }

        const existingBrand = await prisma.brand.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { products: true }
                }
            }
        });

        if (!existingBrand) {
            return res.status(404).json({
                message: "Marca no encontrada."
            });
        }

        if (existingBrand._count.products > 0) {
            return res.status(400).json({
                message: "No es posible eliminar la marca porque tiene productos asociados en el catálogo."
            });
        }

        await prisma.brand.delete({
            where: { id }
        });

        return res.status(200).json({
            message: "Marca eliminada exitosamente"
        });
    } catch (error) {
        next(error);
    }
};
