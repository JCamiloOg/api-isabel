import { Prisma, Product } from "@prisma/client";
import { RequestHandler } from "express";
import { prisma } from "../../../config/prisma.js";

type GetProductById = Prisma.ProductGetPayload<{
    include: {
        brand: true;
        productCategory: true;
        shoeType: true;
        productColors: {
            include: {
                color: true;
                colorImages: true;
                productVariants: {
                    include: {
                        size: true;
                    };
                };
            };
        };
    };
}>;

type GetProductList = Prisma.ProductGetPayload<{
    include: {
        brand: true;
        productCategory: true;
        shoeType: true;
    };
}>;

interface ProductVariantInput {
    sizeId: number;
    currentStock?: number;
    discount?: number;
    status?: boolean;
}

interface ProductColorInput {
    colorId: number;
    image?: string;
    colorImages?: string[];
    status?: boolean;
    sizes?: ProductVariantInput[];
}

interface ProductBody extends Omit<Product, "id" | "status" | "purchasePrice" | "salePrice"> {
    purchasePrice: number;
    salePrice: number;
    status?: boolean;
    colors?: ProductColorInput[];
}

export const getProducts: RequestHandler<
    unknown,
    { message: string; products: GetProductList[] }
> = async (_req, res, next) => {
    try {
        const products = await prisma.product.findMany({
            include: {
                brand: true,
                productCategory: true,
                shoeType: true
            },
            orderBy: {
                id: "desc"
            }
        });

        return res.status(200).json({
            message: "Calzados obtenidos exitosamente",
            products
        });
    } catch (error) {
        next(error);
    }
};

export const getProductById: RequestHandler<
    { id: string },
    { message: string; product?: GetProductById }
> = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

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

        return res.status(200).json({
            message: "Calzado obtenido exitosamente",
            product
        });
    } catch (error) {
        next(error);
    }
};

export const createProduct: RequestHandler<
    unknown,
    { message: string; product?: Product },
    ProductBody
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
            status = true,
            colors
        } = req.body;

        const product = await prisma.product.create({
            data: {
                name,
                sku,
                brandId: Number(brandId),
                productCategoryId: Number(productCategoryId),
                shoeTypeId: Number(shoeTypeId),
                purchasePrice,
                salePrice,
                gender,
                isPublic,
                status: Boolean(status),
                productColors: colors?.length
                    ? {
                        create: colors.map((col) => ({
                            colorId: Number(col.colorId),
                            status: col.status === false ? "Inactive" : "Active",
                            colorImages: col.colorImages?.length
                                ? {
                                    create: col.colorImages.map((imgUrl) => ({
                                        image: imgUrl
                                    }))
                                }
                                : undefined,
                            productVariants: col.sizes?.length
                                ? {
                                    create: col.sizes.map((sz) => ({
                                        sizeId: Number(sz.sizeId),
                                        currentStock: Number(sz.currentStock) || 0,
                                        discount: Number(sz.discount) || 0,
                                        status: sz.status === false ? "Inactive" : "Active"
                                    }))
                                }
                                : undefined
                        }))
                    }
                    : undefined
            }
        });

        return res.status(201).json({
            message: "Calzado registrado exitosamente",
            product
        });
    } catch (error) {
        next(error);
    }
};

export const updateProduct: RequestHandler<
    { id: string },
    { message: string; product?: Product },
    Partial<ProductBody>
> = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
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

        const existingProduct = await prisma.product.findUnique({
            where: { id },
            include: {
                productColors: {
                    include: {
                        productVariants: true
                    }
                }
            }
        });

        if (!existingProduct) {
            return res.status(404).json({
                message: "Calzado no encontrado."
            });
        }

        const product = await prisma.$transaction(async (tx) => {
            const updatedProduct = await tx.product.update({
                where: { id },
                data: {
                    ...(name !== undefined && { name }),
                    ...(sku !== undefined && { sku }),
                    ...(brandId !== undefined && { brandId: Number(brandId) }),
                    ...(productCategoryId !== undefined && { productCategoryId: Number(productCategoryId) }),
                    ...(shoeTypeId !== undefined && { shoeTypeId: Number(shoeTypeId) }),
                    ...(purchasePrice !== undefined && { purchasePrice }),
                    ...(salePrice !== undefined && { salePrice }),
                    ...(gender !== undefined && { gender }),
                    ...(isPublic !== undefined && { isPublic }),
                    ...(status !== undefined && { status: Boolean(status) })
                }
            });

            if (colors !== undefined) {
                const incomingColorIds = colors.map((c) => Number(c.colorId));
                const colorsToDelete = existingProduct.productColors.filter(
                    (pc) => !incomingColorIds.includes(pc.colorId)
                );

                if (colorsToDelete.length > 0) {
                    await tx.productColor.deleteMany({
                        where: {
                            id: { in: colorsToDelete.map((pc) => pc.id) }
                        }
                    });
                }

                for (const col of colors) {
                    const colorId = Number(col.colorId);
                    const existingColor = existingProduct.productColors.find(
                        (pc) => pc.colorId === colorId
                    );

                    if (existingColor) {
                        await tx.productColor.update({
                            where: { id: existingColor.id },
                            data: {
                                status: col.status === false ? "Inactive" : "Active"
                            }
                        });

                        if (col.colorImages !== undefined) {
                            await tx.colorImage.deleteMany({
                                where: { productColorId: existingColor.id }
                            });

                            if (col.colorImages.length > 0) {
                                await tx.colorImage.createMany({
                                    data: col.colorImages.map((imgUrl) => ({
                                        productColorId: existingColor.id,
                                        image: imgUrl
                                    }))
                                });
                            }
                        }

                        if (col.sizes !== undefined) {
                            const incomingSizeIds = col.sizes.map((s) => Number(s.sizeId));
                            const variantsToDelete = existingColor.productVariants.filter(
                                (pv) => !incomingSizeIds.includes(pv.sizeId)
                            );

                            if (variantsToDelete.length > 0) {
                                await tx.productVariant.deleteMany({
                                    where: {
                                        id: { in: variantsToDelete.map((pv) => pv.id) }
                                    }
                                });
                            }

                            for (const sz of col.sizes) {
                                const sizeId = Number(sz.sizeId);
                                const existingVariant = existingColor.productVariants.find(
                                    (pv) => pv.sizeId === sizeId
                                );

                                if (existingVariant) {
                                    await tx.productVariant.update({
                                        where: { id: existingVariant.id },
                                        data: {
                                            currentStock: Number(sz.currentStock) || 0,
                                            discount: Number(sz.discount) || 0,
                                            status: sz.status === false ? "Inactive" : "Active"
                                        }
                                    });
                                } else {
                                    await tx.productVariant.create({
                                        data: {
                                            productColorId: existingColor.id,
                                            sizeId,
                                            currentStock: Number(sz.currentStock) || 0,
                                            discount: Number(sz.discount) || 0,
                                            status: sz.status === false ? "Inactive" : "Active"
                                        }
                                    });
                                }
                            }
                        }
                    } else {
                        await tx.productColor.create({
                            data: {
                                productId: id,
                                colorId,
                                status: col.status === false ? "Inactive" : "Active",
                                colorImages: col.colorImages?.length
                                    ? {
                                        create: col.colorImages.map((imgUrl) => ({
                                            image: imgUrl
                                        }))
                                    }
                                    : undefined,
                                productVariants: col.sizes?.length
                                    ? {
                                        create: col.sizes.map((sz) => ({
                                            sizeId: Number(sz.sizeId),
                                            currentStock: Number(sz.currentStock) || 0,
                                            discount: Number(sz.discount) || 0,
                                            status: sz.status === false ? "Inactive" : "Active"
                                        }))
                                    }
                                    : undefined
                            }
                        });
                    }
                }
            }

            return updatedProduct;
        });

        return res.status(200).json({
            message: "Calzado actualizado exitosamente",
            product
        });
    } catch (error) {
        next(error);
    }
};

export const updateProductStatus: RequestHandler<
    { id: string },
    { message: string; status?: boolean },
    { status: boolean }
> = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body;

        const existingProduct = await prisma.product.findUnique({
            where: { id }
        });

        if (!existingProduct) {
            return res.status(404).json({
                message: "Calzado no encontrado."
            });
        }

        const nextStatus = status !== undefined
            ? Boolean(status)
            : !existingProduct.status;

        await prisma.product.update({
            where: { id },
            data: { status: nextStatus }
        });

        return res.status(200).json({
            message: "Estado del calzado actualizado exitosamente",
            status: nextStatus
        });
    } catch (error) {
        next(error);
    }
};

export const deleteProduct: RequestHandler<
    { id: string },
    { message: string }
> = async (req, res, next) => {
    try {
        const id = Number(req.params.id);

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
            const [salesCount, purchasesCount] = await Promise.all([
                prisma.saleDetail.count({ where: { variantId: { in: variantIds } } }),
                prisma.purchaseDetail.count({ where: { variantId: { in: variantIds } } })
            ]);

            if (salesCount > 0 || purchasesCount > 0) {
                return res.status(400).json({
                    message: "No es posible eliminar el calzado porque tiene ventas o compras asociadas."
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
