import { RequestHandler } from "express";
import { prisma } from "../../../config/prisma.js";

export interface ColorSizeInput {
    sizeId: number;
    currentStock?: number;
    discount?: number;
    status?: string | boolean;
}

export interface ProductColorInput {
    colorId: number;
    image?: string;
    status?: string | boolean;
    sizes?: ColorSizeInput[];
}

export interface CreateProductDTO {
    name: string;
    sku?: string;
    brandId: number;
    productCategoryId: number;
    shoeTypeId?: number;
    purchasePrice: number;
    salePrice: number;
    gender: string;
    isPublic?: boolean;
    status?: string | boolean;
    colors?: ProductColorInput[];
}

export interface UpdateProductDTO {
    name?: string;
    sku?: string;
    brandId?: number;
    productCategoryId?: number;
    shoeTypeId?: number;
    purchasePrice?: number;
    salePrice?: number;
    gender?: string;
    isPublic?: boolean;
    status?: string | boolean;
    colors?: ProductColorInput[];
}

const normalizeStatus = (status: string | boolean | undefined): string => {
    if (status === undefined || status === null) return "Active";
    if (typeof status === "boolean") return status ? "Active" : "Inactive";
    const lower = status.trim().toLowerCase();
    if (lower === "activo" || lower === "active" || lower === "true") return "Active";
    if (lower === "inactivo" || lower === "inactive" || lower === "false") return "Inactive";
    return status;
};

const generateSku = (name: string): string => {
    const clean = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const prefix = clean.slice(0, 4) || "PROD";
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${random}`;
};

export const getProducts: RequestHandler = async (req, res, next) => {
    try {
        const { search, brandId, productCategoryId, shoeTypeId, gender, status, isPublic } = req.query;

        const whereClause: any = {};

        if (typeof search === "string" && search.trim()) {
            const query = search.trim();
            whereClause.OR = [
                { name: { contains: query, mode: "insensitive" } },
                { sku: { contains: query, mode: "insensitive" } },
                { brand: { name: { contains: query, mode: "insensitive" } } },
                { productCategory: { name: { contains: query, mode: "insensitive" } } }
            ];
        }

        if (brandId) {
            whereClause.brandId = Number(brandId);
        }

        if (productCategoryId) {
            whereClause.productCategoryId = Number(productCategoryId);
        }

        if (shoeTypeId) {
            whereClause.shoeTypeId = Number(shoeTypeId);
        }

        if (typeof gender === "string" && gender.trim()) {
            whereClause.gender = { equals: gender.trim(), mode: "insensitive" };
        }

        if (status) {
            whereClause.status = normalizeStatus(status as string);
        }

        if (isPublic !== undefined) {
            whereClause.isPublic = String(isPublic).toLowerCase() === "true";
        }

        const products = await prisma.product.findMany({
            where: whereClause,
            include: {
                brand: true,
                productCategory: true,
                shoeType: true,
                productColors: {
                    include: {
                        color: true,
                        productVariants: {
                            include: {
                                size: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                id: "desc"
            }
        });

        const formattedProducts = products.map((product) => {
            const totalStock = product.productColors.reduce((acc, pc) => {
                return acc + pc.productVariants.reduce((vAcc, pv) => vAcc + pv.currentStock, 0);
            }, 0);

            const colorsCount = product.productColors.length;
            const mainImage = product.productColors.find((pc) => pc.image)?.image ?? product.productColors[0]?.image ?? null;

            return {
                id: product.id,
                sku: product.sku,
                name: product.name,
                image: mainImage,
                brandId: product.brandId,
                brand: product.brand?.name ?? "",
                productCategoryId: product.productCategoryId,
                category: product.productCategory?.name ?? "",
                shoeTypeId: product.shoeTypeId,
                shoeType: product.shoeType?.name ?? "",
                gender: product.gender,
                purchasePrice: Number(product.purchasePrice),
                salePrice: Number(product.salePrice),
                isPublic: product.isPublic,
                status: product.status,
                isActive: product.status === "Active" || product.status === "Activo",
                totalStock,
                colorsCount,
                colors: product.productColors.map((pc) => ({
                    id: pc.id,
                    colorId: pc.colorId,
                    color: pc.color?.name ?? "",
                    hex: pc.color?.hex ?? "",
                    image: pc.image,
                    status: pc.status,
                    sizesCount: pc.productVariants.length,
                    variants: pc.productVariants.map((pv) => ({
                        id: pv.id,
                        sizeId: pv.sizeId,
                        sizeNumber: pv.size?.sizeNumber ?? "",
                        internationalSize: pv.size?.internationalSize ?? "",
                        currentStock: pv.currentStock,
                        discount: Number(pv.discount) || 0,
                        status: pv.status
                    }))
                }))
            };
        });

        return res.status(200).json({
            message: "Calzados obtenidos exitosamente",
            products: formattedProducts
        });
    } catch (error) {
        next(error);
    }
};

export const getProductById: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "El identificador del calzado debe ser un número entero válido."
            });
        }

        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                brand: true,
                productCategory: true,
                shoeType: true,
                productColors: {
                    include: {
                        color: true,
                        colorImages: true,
                        productVariants: {
                            include: {
                                size: true
                            }
                        }
                    }
                }
            }
        });

        if (!product) {
            return res.status(404).json({
                message: "Calzado no encontrado."
            });
        }

        const totalStock = product.productColors.reduce((acc, pc) => {
            return acc + pc.productVariants.reduce((vAcc, pv) => vAcc + pv.currentStock, 0);
        }, 0);

        const colorsCount = product.productColors.length;
        const mainImage = product.productColors.find((pc) => pc.image)?.image ?? product.productColors[0]?.image ?? null;

        return res.status(200).json({
            message: "Calzado obtenido exitosamente",
            product: {
                id: product.id,
                sku: product.sku,
                name: product.name,
                image: mainImage,
                brandId: product.brandId,
                brand: product.brand?.name ?? "",
                productCategoryId: product.productCategoryId,
                category: product.productCategory?.name ?? "",
                shoeTypeId: product.shoeTypeId,
                shoeType: product.shoeType?.name ?? "",
                gender: product.gender,
                purchasePrice: Number(product.purchasePrice),
                salePrice: Number(product.salePrice),
                isPublic: product.isPublic,
                status: product.status,
                isActive: product.status === "Active" || product.status === "Activo",
                totalStock,
                colorsCount,
                colors: product.productColors.map((pc) => ({
                    id: pc.id,
                    colorId: pc.colorId,
                    color: pc.color?.name ?? "",
                    hex: pc.color?.hex ?? "",
                    image: pc.image,
                    status: pc.status,
                    galleryImages: pc.colorImages.map((ci) => ci.image).filter(Boolean),
                    variants: pc.productVariants.map((pv) => ({
                        id: pv.id,
                        sizeId: pv.sizeId,
                        sizeNumber: pv.size?.sizeNumber ?? "",
                        internationalSize: pv.size?.internationalSize ?? "",
                        gender: pv.size?.gender ?? "",
                        currentStock: pv.currentStock,
                        discount: Number(pv.discount) || 0,
                        status: pv.status
                    }))
                }))
            }
        });
    } catch (error) {
        next(error);
    }
};

export const createProduct: RequestHandler<
    {},
    unknown,
    CreateProductDTO
> = async (req, res, next) => {
    try {
        const {
            name,
            sku,
            brandId,
            productCategoryId,
            shoeTypeId,
            purchasePrice,
            salePrice,
            gender,
            isPublic = true,
            status = "Active",
            colors
        } = req.body;

        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                message: "El nombre del producto es obligatorio."
            });
        }

        if (!brandId || !Number.isInteger(Number(brandId))) {
            return res.status(400).json({
                message: "La marca seleccionada es obligatoria."
            });
        }

        if (!productCategoryId || !Number.isInteger(Number(productCategoryId))) {
            return res.status(400).json({
                message: "La categoría seleccionada es obligatoria."
            });
        }

        if (purchasePrice === undefined || isNaN(Number(purchasePrice)) || Number(purchasePrice) < 0) {
            return res.status(400).json({
                message: "El costo de compra es obligatorio y debe ser un valor numérico positivo."
            });
        }

        if (salePrice === undefined || isNaN(Number(salePrice)) || Number(salePrice) < 0) {
            return res.status(400).json({
                message: "El precio de venta es obligatorio y debe ser un valor numérico positivo."
            });
        }

        if (!gender || typeof gender !== "string" || !gender.trim()) {
            return res.status(400).json({
                message: "El género destino es obligatorio."
            });
        }

        const trimmedName = name.trim();
        const finalSku = sku && sku.trim() ? sku.trim() : generateSku(trimmedName);

        if (finalSku) {
            const skuTaken = await prisma.product.findUnique({
                where: { sku: finalSku }
            });

            if (skuTaken) {
                return res.status(409).json({
                    message: `Ya existe un calzado registrado con el SKU '${finalSku}'.`
                });
            }
        }

        let resolvedShoeTypeId = shoeTypeId ? Number(shoeTypeId) : undefined;
        if (!resolvedShoeTypeId) {
            const defaultShoeType = await prisma.shoeType.findFirst({ select: { id: true } });
            resolvedShoeTypeId = defaultShoeType?.id ?? 1;
        }

        const productColorsData = colors && Array.isArray(colors) && colors.length > 0
            ? {
                create: colors.map((col) => ({
                    colorId: Number(col.colorId),
                    image: col.image ?? null,
                    status: col.status !== undefined ? normalizeStatus(col.status) : "Active",
                    productVariants: col.sizes && Array.isArray(col.sizes) && col.sizes.length > 0
                        ? {
                            create: col.sizes.map((sz) => ({
                                sizeId: Number(sz.sizeId),
                                currentStock: Number(sz.currentStock) || 0,
                                discount: Number(sz.discount) || 0,
                                status: sz.status !== undefined ? normalizeStatus(sz.status) : "Active"
                            }))
                        }
                        : undefined
                }))
            }
            : undefined;

        const newProduct = await prisma.product.create({
            data: {
                name: trimmedName,
                sku: finalSku,
                brandId: Number(brandId),
                productCategoryId: Number(productCategoryId),
                shoeTypeId: resolvedShoeTypeId,
                purchasePrice: Number(purchasePrice),
                salePrice: Number(salePrice),
                gender: gender.trim(),
                isPublic: Boolean(isPublic),
                status: normalizeStatus(status),
                productColors: productColorsData
            },
            include: {
                brand: true,
                productCategory: true,
                shoeType: true,
                productColors: {
                    include: {
                        color: true,
                        productVariants: {
                            include: {
                                size: true
                            }
                        }
                    }
                }
            }
        });

        return res.status(201).json({
            message: "Calzado registrado exitosamente",
            product: {
                id: newProduct.id,
                sku: newProduct.sku,
                name: newProduct.name,
                brand: newProduct.brand?.name ?? "",
                category: newProduct.productCategory?.name ?? "",
                gender: newProduct.gender,
                purchasePrice: Number(newProduct.purchasePrice),
                salePrice: Number(newProduct.salePrice),
                isPublic: newProduct.isPublic,
                status: newProduct.status,
                colorsCount: newProduct.productColors.length
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateProduct: RequestHandler<
    { id: string },
    unknown,
    UpdateProductDTO
> = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "El identificador del calzado debe ser un número entero válido."
            });
        }

        const existingProduct = await prisma.product.findUnique({
            where: { id }
        });

        if (!existingProduct) {
            return res.status(404).json({
                message: "Calzado no encontrado."
            });
        }

        const {
            name,
            sku,
            brandId,
            productCategoryId,
            shoeTypeId,
            purchasePrice,
            salePrice,
            gender,
            isPublic,
            status,
            colors
        } = req.body;

        const updateData: any = {};

        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({
                    message: "El nombre del producto no puede estar vacío."
                });
            }
            updateData.name = name.trim();
        }

        if (sku !== undefined && sku !== null) {
            const trimmedSku = sku.trim();
            if (trimmedSku !== existingProduct.sku) {
                const skuTaken = await prisma.product.findFirst({
                    where: {
                        sku: trimmedSku,
                        NOT: { id }
                    }
                });

                if (skuTaken) {
                    return res.status(409).json({
                        message: `Ya existe otro calzado con el SKU '${trimmedSku}'.`
                    });
                }
            }
            updateData.sku = trimmedSku;
        }

        if (brandId !== undefined) {
            updateData.brandId = Number(brandId);
        }

        if (productCategoryId !== undefined) {
            updateData.productCategoryId = Number(productCategoryId);
        }

        if (shoeTypeId !== undefined) {
            updateData.shoeTypeId = Number(shoeTypeId);
        }

        if (purchasePrice !== undefined) {
            updateData.purchasePrice = Number(purchasePrice);
        }

        if (salePrice !== undefined) {
            updateData.salePrice = Number(salePrice);
        }

        if (gender !== undefined) {
            updateData.gender = gender.trim();
        }

        if (isPublic !== undefined) {
            updateData.isPublic = Boolean(isPublic);
        }

        if (status !== undefined) {
            updateData.status = normalizeStatus(status);
        }

        if (colors && Array.isArray(colors)) {
            await prisma.$transaction(async (tx) => {
                await tx.product.update({
                    where: { id },
                    data: updateData
                });

                for (const col of colors) {
                    const colorId = Number(col.colorId);
                    let productColor = await tx.productColor.findUnique({
                        where: {
                            productId_colorId: {
                                productId: id,
                                colorId
                            }
                        }
                    });

                    if (!productColor) {
                        productColor = await tx.productColor.create({
                            data: {
                                productId: id,
                                colorId,
                                image: col.image ?? null,
                                status: col.status !== undefined ? normalizeStatus(col.status) : "Active"
                            }
                        });
                    } else {
                        productColor = await tx.productColor.update({
                            where: { id: productColor.id },
                            data: {
                                ...(col.image !== undefined && { image: col.image }),
                                ...(col.status !== undefined && { status: normalizeStatus(col.status) })
                            }
                        });
                    }

                    if (col.sizes && Array.isArray(col.sizes)) {
                        for (const sz of col.sizes) {
                            const sizeId = Number(sz.sizeId);
                            const existingVariant = await tx.productVariant.findUnique({
                                where: {
                                    productColorId_sizeId: {
                                        productColorId: productColor.id,
                                        sizeId
                                    }
                                }
                            });

                            if (!existingVariant) {
                                await tx.productVariant.create({
                                    data: {
                                        productColorId: productColor.id,
                                        sizeId,
                                        currentStock: Number(sz.currentStock) || 0,
                                        discount: Number(sz.discount) || 0,
                                        status: sz.status !== undefined ? normalizeStatus(sz.status) : "Active"
                                    }
                                });
                            } else {
                                await tx.productVariant.update({
                                    where: { id: existingVariant.id },
                                    data: {
                                        ...(sz.currentStock !== undefined && { currentStock: Number(sz.currentStock) }),
                                        ...(sz.discount !== undefined && { discount: Number(sz.discount) }),
                                        ...(sz.status !== undefined && { status: normalizeStatus(sz.status) })
                                    }
                                });
                            }
                        }
                    }
                }
            });
        } else {
            await prisma.product.update({
                where: { id },
                data: updateData
            });
        }

        const updatedProduct = await prisma.product.findUnique({
            where: { id },
            include: {
                brand: true,
                productCategory: true,
                shoeType: true,
                productColors: {
                    include: {
                        color: true,
                        productVariants: {
                            include: {
                                size: true
                            }
                        }
                    }
                }
            }
        });

        return res.status(200).json({
            message: "Calzado actualizado exitosamente",
            product: updatedProduct
        });
    } catch (error) {
        next(error);
    }
};

export const updateProductStatus: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "El identificador del calzado debe ser un número entero válido."
            });
        }

        const existingProduct = await prisma.product.findUnique({
            where: { id }
        });

        if (!existingProduct) {
            return res.status(404).json({
                message: "Calzado no encontrado."
            });
        }

        const isCurrentlyActive = existingProduct.status === "Active" || existingProduct.status === "Activo";
        const newStatus = isCurrentlyActive ? "Inactive" : "Active";

        const updatedProduct = await prisma.product.update({
            where: { id },
            data: { status: newStatus }
        });

        return res.status(200).json({
            message: "Estado del calzado actualizado exitosamente",
            product: {
                id: updatedProduct.id,
                name: updatedProduct.name,
                status: updatedProduct.status,
                isActive: updatedProduct.status === "Active" || updatedProduct.status === "Activo"
            }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteProduct: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "El identificador del calzado debe ser un número entero válido."
            });
        }

        const existingProduct = await prisma.product.findUnique({
            where: { id },
            include: {
                productColors: {
                    include: {
                        productVariants: {
                            select: { id: true }
                        }
                    }
                }
            }
        });

        if (!existingProduct) {
            return res.status(404).json({
                message: "Calzado no encontrado."
            });
        }

        const variantIds = existingProduct.productColors.flatMap((pc) =>
            pc.productVariants.map((pv) => pv.id)
        );

        if (variantIds.length > 0) {
            const [salesCount, purchasesCount, returnsCount] = await Promise.all([
                prisma.saleDetail.count({ where: { variantId: { in: variantIds } } }),
                prisma.purchaseDetail.count({ where: { variantId: { in: variantIds } } }),
                prisma.saleReturn.count({ where: { variantId: { in: variantIds } } })
            ]);

            if (salesCount > 0 || purchasesCount > 0 || returnsCount > 0) {
                return res.status(400).json({
                    message: "No es posible eliminar el calzado porque tiene movimientos registrados (ventas, compras o devoluciones) en el historial."
                });
            }
        }

        await prisma.product.delete({
            where: { id }
        });

        return res.status(200).json({
            message: "Calzado eliminado exitosamente"
        });
    } catch (error) {
        next(error);
    }
};
