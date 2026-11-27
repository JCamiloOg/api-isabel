import {
  CashRegister,
  Payment,
  PaymentMethod,
  Prisma,
  Sale,
  SaleDetail,
  SaleStatus,
} from "@prisma/client";
import { RequestHandler } from "express";
import { prisma } from "../../../config/prisma.js";

// --- Tipos inferidos con Prisma GetPayload ---
type GetSaleByID = Prisma.SaleGetPayload<{
  select: {
    id: true;
    saleDate: true;
    discount: true;
    isCredit: true;
    isDirectSale: true;
    vat: true;
    status: true;
    customer: {
      select: {
        identityDocument: true;
        firstName: true;
        lastName: true;
        email: true;
        phone: true;
        address: true;
      };
    };
    seller: {
      select: {
        identityDocument: true;
        firstName: true;
        lastName: true;
      };
    };
    saleDetails: {
      select: {
        id: true;
        variantId: true;
        quantity: true;
        unitPrice: true;
        variant: {
          select: {
            currentStock: true;
            discount: true;
            size: true;
            productColor: {
              select: {
                colorImages: true;
                color: true;
                product: {
                  select: {
                    id: true;
                    sku: true;
                    name: true;
                    gender: true;
                    image: true;
                  };
                };
              };
            };
          };
        };
      };
    };
    payments: {
      select: {
        id: true;
        amount: true;
        receipt: true;
        paymentDate: true;
        notes: true;
        cashRegister: {
          select: {
            id: true;
            name: true;
          };
        };
        paymentMethod: {
          select: {
            id: true;
            method: true;
          };
        };
        user: {
          select: {
            identityDocument: true;
            firstName: true;
            lastName: true;
          };
        };
      };
    };
  };
}>;

type GetSale = Prisma.SaleGetPayload<{
  select: {
    id: true;
    saleDate: true;
    discount: true;
    isCredit: true;
    isDirectSale: true;
    vat: true;
    status: true;
    customer: {
      select: {
        identityDocument: true;
        firstName: true;
        lastName: true;
        phone: true;
      };
    };
    seller: {
      select: {
        identityDocument: true;
        firstName: true;
        lastName: true;
      };
    };
    saleDetails: {
      select: {
        quantity: true;
        unitPrice: true;
      };
    };
    payments: {
      select: {
        amount: true;
      };
    };
  };
}>;

// 1. OBTENER TODAS LAS VENTAS O UNA VENTA POR ID (GET /sales y GET /sales/:idSale)
export const getSales: RequestHandler<
  { idSale?: string },
  {
    message: string;
    sales?: GetSale[] | GetSaleByID;
    cashRegisters?: Pick<CashRegister, "id" | "name" | "currentBalance">[];
    paymentMethods?: Pick<PaymentMethod, "id" | "method">[];
  }
> = async (req, res, next) => {
  try {
    const { idSale } = req.params;

    if (idSale) {
      const sale = await prisma.sale.findUnique({
        select: {
          id: true,
          saleDate: true,
          discount: true,
          isCredit: true,
          isDirectSale: true,
          vat: true,
          status: true,
          customer: {
            select: {
              identityDocument: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              address: true,
            },
          },
          seller: {
            select: {
              identityDocument: true,
              firstName: true,
              lastName: true,
            },
          },
          saleDetails: {
            select: {
              id: true,
              variantId: true,
              quantity: true,
              unitPrice: true,
              variant: {
                select: {
                  currentStock: true,
                  discount: true,
                  size: true,
                  productColor: {
                    select: {
                      colorImages: true,
                      color: true,
                      product: {
                        select: {
                          id: true,
                          sku: true,
                          name: true,
                          gender: true,
                          image: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              receipt: true,
              paymentDate: true,
              notes: true,
              cashRegister: {
                select: {
                  id: true,
                  name: true,
                },
              },
              paymentMethod: {
                select: {
                  id: true,
                  method: true,
                },
              },
              user: {
                select: {
                  identityDocument: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: {
              paymentDate: "desc",
            },
          },
        },
        where: { id: idSale },
      });

      if (!sale) {
        return res.status(404).json({ message: "No se ha encontrado la venta." });
      }

      return res.status(200).json({
        message: "Venta obtenida exitosamente",
        sales: sale,
      });
    }

    const sales = await prisma.sale.findMany({
      select: {
        id: true,
        saleDate: true,
        discount: true,
        isCredit: true,
        isDirectSale: true,
        vat: true,
        status: true,
        customer: {
          select: {
            identityDocument: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        seller: {
          select: {
            identityDocument: true,
            firstName: true,
            lastName: true,
          },
        },
        saleDetails: {
          select: {
            quantity: true,
            unitPrice: true,
          },
        },
        payments: {
          select: {
            amount: true,
          },
        },
      },
      orderBy: {
        saleDate: "desc",
      },
    });

    const cashRegisters = await prisma.cashRegister.findMany({
      select: {
        id: true,
        name: true,
        currentBalance: true,
      },
      where: { status: true },
      orderBy: { name: "asc" },
    });

    const paymentMethods = await prisma.paymentMethod.findMany({
      select: {
        id: true,
        method: true,
      },
      orderBy: { id: "asc" },
    });

    return res.status(200).json({
      message: "Ventas obtenidas exitosamente",
      sales,
      cashRegisters,
      paymentMethods,
    });
  } catch (error) {
    next(error);
  }
};

// 2. CREAR VENTA CON DETALLES, DESCUENTO DE STOCK Y ABONO INICIAL OPCIONAL (POST /sales)
export const createSale: RequestHandler<
  unknown,
  { message: string; saleId?: string },
  {
    saleInfo: Omit<Sale, "id" | "saleDate" | "status"> & {
      saleDate?: string | Date;
      status?: SaleStatus;
    };
    saleDetails: Omit<SaleDetail, "id" | "saleId">[];
    initialPayment?: Omit<Payment, "id" | "saleId" | "paymentDate">;
  }
> = async (req, res, next) => {
  try {
    const { saleInfo, saleDetails, initialPayment } = req.body;

    if (!saleInfo || !saleDetails || saleDetails.length === 0) {
      return res.status(400).json({
        message: "Faltan datos de la venta o no se han agregado productos.",
      });
    }

    if (!saleInfo.customerId || !saleInfo.userId) {
      return res.status(400).json({
        message: "El cliente y el vendedor son obligatorios.",
      });
    }

    // Validar existencia de cliente y vendedor
    const [customer, seller] = await Promise.all([
      prisma.user.findUnique({ where: { identityDocument: saleInfo.customerId } }),
      prisma.user.findUnique({ where: { identityDocument: saleInfo.userId } }),
    ]);

    if (!customer) {
      return res.status(404).json({ message: "El cliente seleccionado no existe." });
    }

    if (!seller) {
      return res.status(404).json({ message: "El vendedor seleccionado no existe." });
    }

    // Validar stock disponible para cada variante antes de abrir la transacción
    for (const item of saleDetails) {
      if (Number(item.quantity) <= 0) {
        return res.status(400).json({
          message: "La cantidad de cada producto debe ser mayor a cero.",
        });
      }

      const variant = await prisma.productVariant.findUnique({
        where: { id: Number(item.variantId) },
        include: {
          size: true,
          productColor: {
            include: {
              product: true,
              color: true,
            },
          },
        },
      });

      if (!variant) {
        return res.status(404).json({
          message: `No se encontró la variante con ID ${item.variantId}.`,
        });
      }

      if (variant.currentStock < Number(item.quantity)) {
        return res.status(400).json({
          message: `Stock insuficiente para ${variant.productColor.product.name} (${variant.productColor.color.name} - Talla ${variant.size.sizeNumber}). Disponible: ${variant.currentStock}.`,
        });
      }
    }

    const createdSaleId = await prisma.$transaction(async (tx) => {
      const insertedSale = await tx.sale.create({
        data: {
          customerId: saleInfo.customerId,
          userId: saleInfo.userId,
          saleDate: saleInfo.saleDate ? new Date(saleInfo.saleDate) : new Date(),
          discount: saleInfo.discount ?? 0,
          isCredit: Boolean(saleInfo.isCredit),
          isDirectSale: saleInfo.isDirectSale ?? true,
          vat: saleInfo.vat ?? 0,
          status:
            saleInfo.status ??
            (saleInfo.isCredit ? "Pendiente" : "Entregada"),
        },
      });

      // Crear detalles de venta y descontar inventario
      for (const detail of saleDetails) {
        await tx.saleDetail.create({
          data: {
            saleId: insertedSale.id,
            variantId: Number(detail.variantId),
            quantity: Number(detail.quantity),
            unitPrice: detail.unitPrice,
          },
        });

        await tx.productVariant.update({
          where: { id: Number(detail.variantId) },
          data: {
            currentStock: {
              decrement: Number(detail.quantity),
            },
          },
        });
      }

      // Si viene pago/abono inicial, registrarlo y sumar saldo a la caja
      if (initialPayment && Number(initialPayment.amount) > 0) {
        await tx.payment.create({
          data: {
            saleId: insertedSale.id,
            cashRegisterId: Number(initialPayment.cashRegisterId),
            userId: initialPayment.userId || saleInfo.userId,
            paymentMethodId: Number(initialPayment.paymentMethodId),
            amount: initialPayment.amount,
            receipt: initialPayment.receipt || null,
            notes: initialPayment.notes || null,
          },
        });

        await tx.cashRegister.update({
          where: { id: Number(initialPayment.cashRegisterId) },
          data: {
            currentBalance: {
              increment: Number(initialPayment.amount),
            },
          },
        });
      }

      return insertedSale.id;
    });

    return res.status(201).json({
      message: "Venta registrada exitosamente",
      saleId: createdSaleId,
    });
  } catch (error) {
    next(error);
  }
};

// 3. ACTUALIZAR ESTADO DE LA VENTA Y REVERTIR STOCK SI SE CANCELA (PATCH /sales/status/:idSale)
export const updateSaleStatus: RequestHandler<
  { idSale: string },
  { message: string },
  { status: SaleStatus }
> = async (req, res, next) => {
  try {
    const { idSale } = req.params;
    const { status } = req.body;

    const existSale = await prisma.sale.findUnique({
      where: { id: idSale },
      include: {
        saleDetails: true,
      },
    });

    if (!existSale) {
      return res.status(404).json({
        message: "No se ha encontrado la venta indicada.",
      });
    }

    if (existSale.status === "Cancelada" && status !== "Cancelada") {
      return res.status(400).json({
        message: "No se puede reactivar una venta que ya fue cancelada.",
      });
    }

    await prisma.$transaction(async (tx) => {
      // Si pasa a Cancelada por primera vez, reintegrar el stock de cada variante
      if (status === "Cancelada" && existSale.status !== "Cancelada") {
        for (const item of existSale.saleDetails) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              currentStock: {
                increment: item.quantity,
              },
            },
          });
        }
      }

      await tx.sale.update({
        where: { id: idSale },
        data: { status },
      });
    });

    return res.status(200).json({
      message: "Estado de la venta actualizado exitosamente!",
    });
  } catch (error) {
    next(error);
  }
};

// 4. REGISTRAR ABONO / PAGO A UNA VENTA (POST /sales/payment/:idSale)
export const addSalePayment: RequestHandler<
  { idSale: string },
  { message: string },
  {
    payment: Omit<Payment, "id" | "saleId" | "paymentDate">;
  }
> = async (req, res, next) => {
  try {
    const { idSale } = req.params;
    const { payment } = req.body;

    if (!payment || Number(payment.amount) <= 0) {
      return res.status(400).json({
        message: "El monto del abono debe ser mayor a cero.",
      });
    }

    const sale = await prisma.sale.findUnique({
      where: { id: idSale },
      include: {
        saleDetails: true,
        payments: true,
      },
    });

    if (!sale) {
      return res.status(404).json({
        message: "No se ha encontrado la venta indicada.",
      });
    }

    if (sale.status === "Cancelada") {
      return res.status(400).json({
        message: "No se pueden registrar pagos sobre una venta cancelada.",
      });
    }

    // Calcular total neto de la venta y saldo pendiente
    const subtotal = sale.saleDetails.reduce(
      (acc, d) => acc + Number(d.unitPrice) * d.quantity,
      0
    );
    const discountAmount = subtotal * (Number(sale.discount) / 100);
    const taxableBase = subtotal - discountAmount;
    const totalSale = taxableBase + taxableBase * (Number(sale.vat) / 100);
    const totalPaid = sale.payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const pendingBalance = Math.max(0, totalSale - totalPaid);

    if (Number(payment.amount) > pendingBalance + 0.01) {
      return res.status(400).json({
        message: `El abono supera el saldo pendiente de la venta ($${pendingBalance.toLocaleString("es-CO")}).`,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          saleId: idSale,
          cashRegisterId: Number(payment.cashRegisterId),
          userId: payment.userId,
          paymentMethodId: Number(payment.paymentMethodId),
          amount: payment.amount,
          receipt: payment.receipt || null,
          notes: payment.notes || null,
        },
      });

      await tx.cashRegister.update({
        where: { id: Number(payment.cashRegisterId) },
        data: {
          currentBalance: {
            increment: Number(payment.amount),
          },
        },
      });

      // Si con este abono se cubre la totalidad de la deuda, marcar como Completada
      if (totalPaid + Number(payment.amount) >= totalSale - 0.01) {
        await tx.sale.update({
          where: { id: idSale },
          data: { status: SaleStatus.Entregada },
        });
      }
    });

    return res.status(201).json({
      message: "Abono registrado exitosamente.",
    });
  } catch (error) {
    next(error);
  }
};

// 5. BUSCAR CLIENTES PARA EL SELECTOR DE VENTAS (GET /sales/customers?search=...)
export const getCustomersForSale: RequestHandler<
  unknown,
  unknown,
  unknown,
  { search?: string }
> = async (req, res, next) => {
  try {
    const search = req.query.search?.trim() || "";

    const customers = await prisma.user.findMany({
      select: {
        identityDocument: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
      },
      where: {
        status: true,
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { identityDocument: { contains: search, mode: "insensitive" } },
        ],
      },
      take: 20,
      orderBy: { firstName: "asc" },
    });

    return res.status(200).json({ customers });
  } catch (error) {
    next(error);
  }
};

// 6. BUSCAR PRODUCTOS CON STOCK DISPONIBLE PARA VENDER (GET /sales/products?search=...)
export const getProductsForSale: RequestHandler<
  unknown,
  unknown,
  unknown,
  { search?: string }
> = async (req, res, next) => {
  try {
    const search = req.query.search?.trim() || "";

    const products = await prisma.product.findMany({
      select: {
        id: true,
        sku: true,
        name: true,
        salePrice: true,
        gender: true,
        brand: true,
        image: true,
        productColors: {
          where: { status: "Active" },
          select: {
            id: true,
            colorImages: true,
            color: true,
            productVariants: {
              where: {
                status: "Active",
                currentStock: { gt: 0 },
              },
              select: {
                id: true,
                currentStock: true,
                discount: true,
                size: true,
              },
            },
          },
        },
      },
      where: {
        status: true,
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
        ],
      },
      take: 20,
    });

    return res.status(200).json({ products });
  } catch (error) {
    next(error);
  }
};