import { RequestHandler } from "express";
import { prisma } from "../../../config/prisma.js";

export interface CreateColorDTO {
    color: string;
    hex: string;
}

export interface UpdateColorDTO {
    color?: string;
    hex?: string;
}

const normalizeHex = (hex: string): string => {
    const trimmed = hex.trim();
    if (!trimmed.startsWith("#") && /^[0-9A-Fa-f]{3,8}$/.test(trimmed)) {
        return `#${trimmed}`;
    }
    return trimmed;
};

export const getColors: RequestHandler = async (req, res, next) => {
    try {
        const { search } = req.query;

        const whereClause: {
            OR?: Array<
                | { name: { contains: string; mode: "insensitive" } }
                | { hex: { contains: string; mode: "insensitive" } }
            >;
        } = {};

        if (typeof search === "string" && search.trim()) {
            const query = search.trim();
            whereClause.OR = [
                { name: { contains: query, mode: "insensitive" } },
                { hex: { contains: query, mode: "insensitive" } }
            ];
        }

        const colors = await prisma.color.findMany({
            where: whereClause,
            include: {
                _count: {
                    select: { productColors: true }
                }
            },
            orderBy: {
                id: "asc"
            }
        });

        const lastColor = await prisma.color.findFirst({
            orderBy: { id: "desc" },
            select: { id: true }
        });
        const nextId = (lastColor?.id ?? 0) + 1;

        const formattedColors = colors.map((c) => ({
            id: c.id,
            color: c.name,
            hex: c.hex,
            productsCount: c._count.productColors
        }));

        return res.status(200).json({
            message: "Colores obtenidos exitosamente",
            nextId,
            colors: formattedColors
        });
    } catch (error) {
        next(error);
    }
};

export const getNextColorId: RequestHandler = async (_req, res, next) => {
    try {
        const lastColor = await prisma.color.findFirst({
            orderBy: { id: "desc" },
            select: { id: true }
        });
        const nextId = (lastColor?.id ?? 0) + 1;

        return res.status(200).json({
            message: "Próximo ID obtenido exitosamente",
            nextId
        });
    } catch (error) {
        next(error);
    }
};

export const getColorById: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "El identificador del color debe ser un número entero válido."
            });
        }

        const color = await prisma.color.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { productColors: true }
                }
            }
        });

        if (!color) {
            return res.status(404).json({
                message: "Color no encontrado."
            });
        }

        return res.status(200).json({
            message: "Color obtenido exitosamente",
            color: {
                id: color.id,
                color: color.name,
                hex: color.hex,
                productsCount: color._count.productColors
            }
        });
    } catch (error) {
        next(error);
    }
};

export const createColor: RequestHandler<
    {},
    unknown,
    CreateColorDTO
> = async (req, res, next) => {
    try {
        const rawColor = req.body.color ?? (req.body as any).name;
        const rawHex = req.body.hex;

        if (!rawColor || typeof rawColor !== "string" || !rawColor.trim()) {
            return res.status(400).json({
                message: "El nombre del color es obligatorio."
            });
        }

        if (!rawHex || typeof rawHex !== "string" || !rawHex.trim()) {
            return res.status(400).json({
                message: "El código hexadecimal del color es obligatorio."
            });
        }

        const trimmedColor = rawColor.trim();
        const normalizedHexCode = normalizeHex(rawHex);

        if (trimmedColor.length > 50) {
            return res.status(400).json({
                message: "El nombre del color no puede superar los 50 caracteres."
            });
        }

        if (normalizedHexCode.length > 50) {
            return res.status(400).json({
                message: "El código hexadecimal no puede superar los 50 caracteres."
            });
        }

        const existingColor = await prisma.color.findFirst({
            where: {
                name: {
                    equals: trimmedColor,
                    mode: "insensitive"
                }
            }
        });

        if (existingColor) {
            return res.status(409).json({
                message: "Ya existe un color registrado con este nombre."
            });
        }

        const newColor = await prisma.color.create({
            data: {
                name: trimmedColor,
                hex: normalizedHexCode
            }
        });

        return res.status(201).json({
            message: "Color creado exitosamente",
            color: {
                id: newColor.id,
                color: newColor.name,
                hex: newColor.hex
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateColor: RequestHandler<
    { id: string },
    unknown,
    UpdateColorDTO
> = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "El identificador del color debe ser un número entero válido."
            });
        }

        const existingColor = await prisma.color.findUnique({
            where: { id }
        });

        if (!existingColor) {
            return res.status(404).json({
                message: "Color no encontrado."
            });
        }

        const rawColor = req.body.color ?? (req.body as any).name;
        const rawHex = req.body.hex;
        const updateData: { name?: string; hex?: string } = {};

        if (rawColor !== undefined) {
            if (typeof rawColor !== "string" || !rawColor.trim()) {
                return res.status(400).json({
                    message: "El nombre del color no puede estar vacío."
                });
            }

            const trimmedColor = rawColor.trim();

            if (trimmedColor.length > 50) {
                return res.status(400).json({
                    message: "El nombre del color no puede superar los 50 caracteres."
                });
            }

            if (trimmedColor.toLowerCase() !== existingColor.name.toLowerCase()) {
                const nameTaken = await prisma.color.findFirst({
                    where: {
                        name: {
                            equals: trimmedColor,
                            mode: "insensitive"
                        },
                        NOT: { id }
                    }
                });

                if (nameTaken) {
                    return res.status(409).json({
                        message: "Ya existe otro color con este nombre."
                    });
                }
            }

            updateData.name = trimmedColor;
        }

        if (rawHex !== undefined) {
            if (typeof rawHex !== "string" || !rawHex.trim()) {
                return res.status(400).json({
                    message: "El código hexadecimal del color no puede estar vacío."
                });
            }

            const normalized = normalizeHex(rawHex);

            if (normalized.length > 50) {
                return res.status(400).json({
                    message: "El código hexadecimal no puede superar los 50 caracteres."
                });
            }

            updateData.hex = normalized;
        }

        const updatedColor = await prisma.color.update({
            where: { id },
            data: updateData
        });

        return res.status(200).json({
            message: "Color actualizado exitosamente",
            color: {
                id: updatedColor.id,
                color: updatedColor.name,
                hex: updatedColor.hex
            }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteColor: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "El identificador del color debe ser un número entero válido."
            });
        }

        const existingColor = await prisma.color.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { productColors: true }
                }
            }
        });

        if (!existingColor) {
            return res.status(404).json({
                message: "Color no encontrado."
            });
        }

        if (existingColor._count.productColors > 0) {
            return res.status(400).json({
                message: "No es posible eliminar el color porque está asociado a productos en el inventario."
            });
        }

        await prisma.color.delete({
            where: { id }
        });

        return res.status(200).json({
            message: "Color eliminado exitosamente"
        });
    } catch (error) {
        next(error);
    }
};
