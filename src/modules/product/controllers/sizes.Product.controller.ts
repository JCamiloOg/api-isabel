import { RequestHandler } from "express";
import { prisma } from "../../../config/prisma.js";

export interface CreateSizeDTO {
    sizeNumber?: string;
    size?: string;
    size_number?: string;
    gender: string;
    internationalSize?: string;
    international_size?: string;
}

export interface UpdateSizeDTO {
    sizeNumber?: string;
    size?: string;
    size_number?: string;
    gender?: string;
    internationalSize?: string;
    international_size?: string;
}

const normalizeGender = (gender: string): string => {
    const lower = gender.trim().toLowerCase();
    if (lower === "masculino" || lower === "hombre") return "Masculino";
    if (lower === "femenino" || lower === "mujer") return "Femenino";
    return gender.trim();
};

const isValidGender = (gender: string): boolean => {
    const lower = gender.trim().toLowerCase();
    return ["hombre", "mujer", "masculino", "femenino"].includes(lower);
};

export const getSizes: RequestHandler = async (req, res, next) => {
    try {
        const { search, gender } = req.query;

        const whereClause: {
            OR?: Array<
                | { sizeNumber: { contains: string; mode: "insensitive" } }
                | { internationalSize: { contains: string; mode: "insensitive" } }
            >;
            gender?: { in: string[] } | string;
        } = {};

        if (typeof search === "string" && search.trim()) {
            const query = search.trim();
            whereClause.OR = [
                { sizeNumber: { contains: query, mode: "insensitive" } },
                { internationalSize: { contains: query, mode: "insensitive" } }
            ];
        }

        if (typeof gender === "string" && gender.trim()) {
            const normalized = normalizeGender(gender);
            whereClause.gender = {
                in: [normalized, normalized === "Masculino" ? "Hombre" : "Mujer"]
            };
        }

        const sizes = await prisma.size.findMany({
            where: whereClause,
            include: {
                _count: {
                    select: { productVariants: true }
                }
            },
            orderBy: {
                id: "asc"
            }
        });

        const lastSize = await prisma.size.findFirst({
            orderBy: { id: "desc" },
            select: { id: true }
        });
        const nextId = (lastSize?.id ?? 0) + 1;

        const formattedSizes = sizes.map((size) => ({
            id: size.id,
            sizeNumber: size.sizeNumber,
            gender: size.gender,
            internationalSize: size.internationalSize,
            variantsCount: size._count.productVariants
        }));

        return res.status(200).json({
            message: "Tallas obtenidas exitosamente",
            nextId,
            sizes: formattedSizes
        });
    } catch (error) {
        next(error);
    }
};

export const getNextSizeId: RequestHandler = async (_req, res, next) => {
    try {
        const lastSize = await prisma.size.findFirst({
            orderBy: { id: "desc" },
            select: { id: true }
        });
        const nextId = (lastSize?.id ?? 0) + 1;

        return res.status(200).json({
            message: "Próximo ID obtenido exitosamente",
            nextId
        });
    } catch (error) {
        next(error);
    }
};

export const getSizeById: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "El identificador de la talla debe ser un número entero válido."
            });
        }

        const size = await prisma.size.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { productVariants: true }
                }
            }
        });

        if (!size) {
            return res.status(404).json({
                message: "Talla no encontrada."
            });
        }

        return res.status(200).json({
            message: "Talla obtenida exitosamente",
            size: {
                id: size.id,
                sizeNumber: size.sizeNumber,
                gender: size.gender,
                internationalSize: size.internationalSize,
                variantsCount: size._count.productVariants
            }
        });
    } catch (error) {
        next(error);
    }
};

export const createSize: RequestHandler<
    {},
    unknown,
    CreateSizeDTO
> = async (req, res, next) => {
    try {
        const rawSizeNumber = req.body.sizeNumber ?? req.body.size ?? req.body.size_number;
        const rawGender = req.body.gender;
        const rawInternationalSize = req.body.internationalSize ?? req.body.international_size;

        if (!rawSizeNumber || typeof rawSizeNumber !== "string" || !rawSizeNumber.trim()) {
            return res.status(400).json({
                message: "El número de la talla es obligatorio."
            });
        }

        if (!rawGender || typeof rawGender !== "string" || !isValidGender(rawGender)) {
            return res.status(400).json({
                message: "El género es obligatorio y solo puede ser 'Hombre' (Masculino) o 'Mujer' (Femenino)."
            });
        }

        if (!rawInternationalSize || typeof rawInternationalSize !== "string" || !rawInternationalSize.trim()) {
            return res.status(400).json({
                message: "La talla internacional es obligatoria."
            });
        }

        const trimmedSizeNumber = rawSizeNumber.trim();
        const normalizedGender = normalizeGender(rawGender);
        const trimmedInternationalSize = rawInternationalSize.trim();

        if (trimmedSizeNumber.length > 10) {
            return res.status(400).json({
                message: "El número de la talla no puede superar los 10 caracteres."
            });
        }

        if (trimmedInternationalSize.length > 10) {
            return res.status(400).json({
                message: "La talla internacional no puede superar los 10 caracteres."
            });
        }

        const existingSize = await prisma.size.findFirst({
            where: {
                sizeNumber: {
                    equals: trimmedSizeNumber,
                    mode: "insensitive"
                },
                gender: {
                    in: [normalizedGender, normalizedGender === "Masculino" ? "Hombre" : "Mujer"]
                }
            }
        });

        if (existingSize) {
            return res.status(409).json({
                message: `Ya existe la talla ${trimmedSizeNumber} registrada para el género ${normalizedGender}.`
            });
        }

        const newSize = await prisma.size.create({
            data: {
                sizeNumber: trimmedSizeNumber,
                gender: normalizedGender,
                internationalSize: trimmedInternationalSize
            }
        });

        return res.status(201).json({
            message: "Talla creada exitosamente",
            size: {
                id: newSize.id,
                sizeNumber: newSize.sizeNumber,
                gender: newSize.gender,
                internationalSize: newSize.internationalSize
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateSize: RequestHandler<
    { id: string },
    unknown,
    UpdateSizeDTO
> = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "El identificador de la talla debe ser un número entero válido."
            });
        }

        const existingSize = await prisma.size.findUnique({
            where: { id }
        });

        if (!existingSize) {
            return res.status(404).json({
                message: "Talla no encontrada."
            });
        }

        const rawSizeNumber = req.body.sizeNumber ?? req.body.size ?? req.body.size_number;
        const rawGender = req.body.gender;
        const rawInternationalSize = req.body.internationalSize ?? req.body.international_size;

        const updateData: {
            sizeNumber?: string;
            gender?: string;
            internationalSize?: string;
        } = {};

        let checkSizeNumber = existingSize.sizeNumber;
        let checkGender = existingSize.gender;

        if (rawSizeNumber !== undefined) {
            if (typeof rawSizeNumber !== "string" || !rawSizeNumber.trim()) {
                return res.status(400).json({
                    message: "El número de la talla no puede estar vacío."
                });
            }
            const trimmed = rawSizeNumber.trim();
            if (trimmed.length > 10) {
                return res.status(400).json({
                    message: "El número de la talla no puede superar los 10 caracteres."
                });
            }
            updateData.sizeNumber = trimmed;
            checkSizeNumber = trimmed;
        }

        if (rawGender !== undefined) {
            if (typeof rawGender !== "string" || !isValidGender(rawGender)) {
                return res.status(400).json({
                    message: "El género solo puede ser 'Hombre' (Masculino) o 'Mujer' (Femenino)."
                });
            }
            const normalized = normalizeGender(rawGender);
            updateData.gender = normalized;
            checkGender = normalized;
        }

        if (rawInternationalSize !== undefined) {
            if (typeof rawInternationalSize !== "string" || !rawInternationalSize.trim()) {
                return res.status(400).json({
                    message: "La talla internacional no puede estar vacía."
                });
            }
            const trimmed = rawInternationalSize.trim();
            if (trimmed.length > 10) {
                return res.status(400).json({
                    message: "La talla internacional no puede superar los 10 caracteres."
                });
            }
            updateData.internationalSize = trimmed;
        }

        const normalizedCheckGender = normalizeGender(checkGender);
        const duplicate = await prisma.size.findFirst({
            where: {
                sizeNumber: {
                    equals: checkSizeNumber,
                    mode: "insensitive"
                },
                gender: {
                    in: [normalizedCheckGender, normalizedCheckGender === "Masculino" ? "Hombre" : "Mujer"]
                },
                NOT: { id }
            }
        });

        if (duplicate) {
            return res.status(409).json({
                message: `Ya existe otra talla ${checkSizeNumber} registrada para el género ${normalizedCheckGender}.`
            });
        }

        const updatedSize = await prisma.size.update({
            where: { id },
            data: updateData
        });

        return res.status(200).json({
            message: "Talla actualizada exitosamente",
            size: {
                id: updatedSize.id,
                sizeNumber: updatedSize.sizeNumber,
                gender: updatedSize.gender,
                internationalSize: updatedSize.internationalSize
            }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteSize: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "El identificador de la talla debe ser un número entero válido."
            });
        }

        const existingSize = await prisma.size.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { productVariants: true }
                }
            }
        });

        if (!existingSize) {
            return res.status(404).json({
                message: "Talla no encontrada."
            });
        }

        if (existingSize._count.productVariants > 0) {
            return res.status(400).json({
                message: "No es posible eliminar la talla porque tiene variantes de productos asociadas en el inventario."
            });
        }

        await prisma.size.delete({
            where: { id }
        });

        return res.status(200).json({
            message: "Talla eliminada exitosamente"
        });
    } catch (error) {
        next(error);
    }
};
