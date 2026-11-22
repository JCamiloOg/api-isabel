import { RequestHandler } from "express";
import { prisma } from "../../../config/prisma.js";

export interface CreateClientDTO {
    identityDocument: string;
    documentTypeId: number;
    firstName: string;
    lastName?: string;
    email: string;
    phone: string;
    address?: string;
    status?: boolean;
}

export interface UpdateClientDTO {
    documentTypeId?: number;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    status?: boolean;
}

export const getClients: RequestHandler = async (_req, res, next) => {
    try {
        const clients = await prisma.user.findMany({
            where: {
                OR: [
                    { role: { name: { equals: "Cliente", mode: "insensitive" } } },
                    { roleId: 3 },
                    { salesAsCustomer: { some: {} } }
                ]
            },
            select: {
                identityDocument: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                address: true,
                status: true,
                createdAt: true,
                documentType: {
                    select: {
                        id: true,
                        documentType: true
                    }
                },
                _count: {
                    select: {
                        salesAsCustomer: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        const formattedClients = clients.map((client) => ({
            identityDocument: client.identityDocument,
            documentType: client.documentType?.documentType ?? "",
            fullName: `${client.firstName} ${client.lastName}`.trim(),
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email,
            phone: client.phone,
            address: client.address ?? "",
            status: client.status,
            totalOrders: client._count.salesAsCustomer
        }));

        return res.status(200).json({
            message: "Clientes obtenidos exitosamente",
            clients: formattedClients
        });
    } catch (error) {
        next(error);
    }
};

export const getClientById: RequestHandler<{ identityDocument: string }> = async (req, res, next) => {
    try {
        const { identityDocument } = req.params;

        if (!identityDocument) {
            return res.status(400).json({
                message: "El documento de identidad es requerido."
            });
        }

        const client = await prisma.user.findUnique({
            where: { identityDocument },
            select: {
                identityDocument: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                address: true,
                status: true,
                createdAt: true,
                documentType: {
                    select: {
                        id: true,
                        documentType: true
                    }
                },
                salesAsCustomer: {
                    select: {
                        id: true,
                        saleDate: true,
                        status: true,
                        discount: true,
                        vat: true,
                        saleDetails: {
                            select: {
                                quantity: true,
                                unitPrice: true
                            }
                        }
                    },
                    orderBy: {
                        saleDate: "desc"
                    }
                }
            }
        });

        if (!client) {
            return res.status(404).json({
                message: "Cliente no encontrado."
            });
        }

        const totalOrders = client.salesAsCustomer.length;
        const lastPurchase = client.salesAsCustomer[0] ?? null;
        const lastPurchaseDate = lastPurchase ? lastPurchase.saleDate : null;

        const purchaseVolume = client.salesAsCustomer.reduce((totalAcc, sale) => {
            if (sale.status === "Cancelada") return totalAcc;

            const subtotal = sale.saleDetails.reduce((detailAcc, item) => {
                return detailAcc + Number(item.unitPrice) * item.quantity;
            }, 0);

            const discountRate = Number(sale.discount) || 0;
            const vatRate = Number(sale.vat) || 0;
            const discounted = subtotal * (1 - discountRate / 100);
            const total = discounted * (1 + vatRate / 100);

            return totalAcc + (total > 0 ? total : subtotal);
        }, 0);

        return res.status(200).json({
            message: "Cliente obtenido exitosamente",
            client: {
                identityDocument: client.identityDocument,
                documentType: client.documentType?.documentType ?? "",
                fullName: `${client.firstName} ${client.lastName}`.trim(),
                firstName: client.firstName,
                lastName: client.lastName,
                email: client.email,
                phone: client.phone,
                address: client.address ?? "",
                status: client.status,
                metrics: {
                    totalOrders,
                    purchaseVolume,
                    lastPurchaseDate
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

export const createClient: RequestHandler<
    {},
    unknown,
    CreateClientDTO
> = async (req, res, next) => {
    try {
        const {
            identityDocument,
            documentTypeId,
            firstName,
            lastName = "",
            email,
            phone,
            address,
            status = true
        } = req.body;

        if (!identityDocument || !documentTypeId || !firstName || !email || !phone) {
            return res.status(400).json({
                message: "Los campos documento de identidad, tipo de documento, nombre, correo y teléfono son obligatorios."
            });
        }

        const existingDocument = await prisma.user.findUnique({
            where: { identityDocument }
        });

        if (existingDocument) {
            return res.status(409).json({
                message: "Ya existe un cliente con este documento de identidad."
            });
        }

        const existingEmail = await prisma.user.findUnique({
            where: { email }
        });

        if (existingEmail) {
            return res.status(409).json({
                message: "Ya existe un usuario o cliente registrado con este correo electrónico."
            });
        }

        const clientRole = await prisma.role.findFirst({
            where: {
                name: { equals: "Cliente", mode: "insensitive" }
            }
        });

        const newClient = await prisma.user.create({
            data: {
                identityDocument,
                documentTypeId: Number(documentTypeId),
                firstName,
                lastName: lastName ?? "",
                email,
                phone,
                address: address ?? null,
                status: status !== undefined ? Boolean(status) : true,
                roleId: clientRole?.id ?? 3
            },
            select: {
                identityDocument: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                address: true,
                status: true,
                createdAt: true,
                documentType: {
                    select: {
                        id: true,
                        documentType: true
                    }
                }
            }
        });

        return res.status(201).json({
            message: "Cliente creado exitosamente",
            client: {
                identityDocument: newClient.identityDocument,
                documentType: newClient.documentType?.documentType ?? "",
                fullName: `${newClient.firstName} ${newClient.lastName}`.trim(),
                firstName: newClient.firstName,
                lastName: newClient.lastName,
                email: newClient.email,
                phone: newClient.phone,
                address: newClient.address ?? "",
                status: newClient.status
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateClient: RequestHandler<
    { identityDocument: string },
    unknown,
    UpdateClientDTO
> = async (req, res, next) => {
    try {
        const { identityDocument } = req.params;

        if (!identityDocument) {
            return res.status(400).json({
                message: "El documento de identidad es requerido."
            });
        }

        const existingClient = await prisma.user.findUnique({
            where: { identityDocument }
        });

        if (!existingClient) {
            return res.status(404).json({
                message: "Cliente no encontrado."
            });
        }

        const {
            documentTypeId,
            firstName,
            lastName,
            email,
            phone,
            address,
            status
        } = req.body;

        if (email && email !== existingClient.email) {
            const emailTaken = await prisma.user.findUnique({
                where: { email }
            });

            if (emailTaken) {
                return res.status(409).json({
                    message: "Ya existe un usuario o cliente registrado con este correo electrónico."
                });
            }
        }

        const updatedClient = await prisma.user.update({
            where: { identityDocument },
            data: {
                ...(documentTypeId !== undefined && { documentTypeId: Number(documentTypeId) }),
                ...(firstName !== undefined && { firstName }),
                ...(lastName !== undefined && { lastName }),
                ...(email !== undefined && { email }),
                ...(phone !== undefined && { phone }),
                ...(address !== undefined && { address }),
                ...(status !== undefined && { status: Boolean(status) })
            },
            select: {
                identityDocument: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                address: true,
                status: true,
                createdAt: true,
                documentType: {
                    select: {
                        id: true,
                        documentType: true
                    }
                }
            }
        });

        return res.status(200).json({
            message: "Cliente actualizado exitosamente",
            client: {
                identityDocument: updatedClient.identityDocument,
                documentType: updatedClient.documentType?.documentType ?? "",
                fullName: `${updatedClient.firstName} ${updatedClient.lastName}`.trim(),
                firstName: updatedClient.firstName,
                lastName: updatedClient.lastName,
                email: updatedClient.email,
                phone: updatedClient.phone,
                address: updatedClient.address ?? "",
                status: updatedClient.status
            }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteClient: RequestHandler<{ identityDocument: string }> = async (req, res, next) => {
    try {
        const { identityDocument } = req.params;

        if (!identityDocument) {
            return res.status(400).json({
                message: "El documento de identidad es requerido."
            });
        }

        const existingClient = await prisma.user.findUnique({
            where: { identityDocument },
            include: {
                _count: {
                    select: {
                        salesAsCustomer: true
                    }
                }
            }
        });

        if (!existingClient) {
            return res.status(404).json({
                message: "Cliente no encontrado."
            });
        }

        if (existingClient._count.salesAsCustomer > 0) {
            return res.status(400).json({
                message: "No es posible eliminar el cliente porque tiene pedidos o ventas registradas en el historial."
            });
        }

        await prisma.user.delete({
            where: { identityDocument }
        });

        return res.status(200).json({
            message: "Cliente eliminado exitosamente"
        });
    } catch (error) {
        next(error);
    }
};
