import { DocumentType, Prisma, Role, User } from "@prisma/client";
import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../../config/prisma.js";

// --- Tipos inferidos con Prisma GetPayload (sin exponer password) ---
type GetUserByID = Prisma.UserGetPayload<{
  select: {
    identityDocument: true;
    documentTypeId: true;
    documentType: {
      select: {
        id: true;
        documentType: true;
      };
    };
    firstName: true;
    lastName: true;
    email: true;
    phone: true;
    address: true;
    status: true;
    createdAt: true;
    roleId: true;
    role: {
      select: {
        id: true;
        name: true;
        description: true;
      };
    };
  };
}>;

type GetUser = Prisma.UserGetPayload<{
  select: {
    identityDocument: true;
    documentTypeId: true;
    documentType: {
      select: {
        id: true;
        documentType: true;
      };
    };
    firstName: true;
    lastName: true;
    email: true;
    phone: true;
    address: true;
    status: true;
    createdAt: true;
    roleId: true;
    role: {
      select: {
        id: true;
        name: true;
      };
    };
  };
}>;

// 1. OBTENER TODOS LOS USUARIOS O UN USUARIO POR DOCUMENTO (GET /users y GET /users/:identityDocument)
export const getUsers: RequestHandler<
  { identityDocument?: string },
  {
    message: string;
    users?: GetUser[] | GetUserByID;
    roles?: Pick<Role, "id" | "name">[];
    documentTypes?: Pick<DocumentType, "id" | "documentType">[];
  }
> = async (req, res, next) => {
  try {
    const { identityDocument } = req.params;

    if (identityDocument) {
      const user = await prisma.user.findUnique({
        select: {
          identityDocument: true,
          documentTypeId: true,
          documentType: {
            select: {
              id: true,
              documentType: true,
            },
          },
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          address: true,
          status: true,
          createdAt: true,
          roleId: true,
          role: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
        where: { identityDocument },
      });

      if (!user) {
        return res.status(404).json({ message: "No se ha encontrado el usuario." });
      }

      return res.status(200).json({
        message: "Usuario obtenido exitosamente",
        users: user,
      });
    }

    const users = await prisma.user.findMany({
      select: {
        identityDocument: true,
        documentTypeId: true,
        documentType: {
          select: {
            id: true,
            documentType: true,
          },
        },
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        status: true,
        createdAt: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    const documentTypes = await prisma.documentType.findMany({
      select: {
        id: true,
        documentType: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    return res.status(200).json({
      message: "Usuarios obtenidos exitosamente",
      users,
      roles,
      documentTypes,
    });
  } catch (error) {
    next(error);
  }
};

// 2. CREAR USUARIO (POST /users)
export const createUser: RequestHandler<
  unknown,
  { message: string },
  {
    userInfo: Omit<User, "status" | "createdAt">;
  }
> = async (req, res, next) => {
  try {
    const { userInfo } = req.body;

    if (
      !userInfo ||
      !userInfo.identityDocument ||
      !userInfo.documentTypeId ||
      !userInfo.firstName ||
      !userInfo.lastName ||
      !userInfo.email ||
      !userInfo.phone
    ) {
      return res.status(400).json({
        message: "Faltan campos obligatorios por llenar.",
      });
    }

    const existDocument = await prisma.user.findUnique({
      where: { identityDocument: userInfo.identityDocument.trim() },
    });

    if (existDocument) {
      return res.status(400).json({
        message: "El número de documento ya se encuentra registrado.",
      });
    }

    const existEmail = await prisma.user.findUnique({
      where: { email: userInfo.email.trim().toLowerCase() },
    });

    if (existEmail) {
      return res.status(400).json({
        message: "El correo electrónico ya está registrado en otro usuario.",
      });
    }

    const docTypeExists = await prisma.documentType.findUnique({
      where: { id: Number(userInfo.documentTypeId) },
    });

    if (!docTypeExists) {
      return res.status(404).json({
        message: "El tipo de documento seleccionado no existe.",
      });
    }

    if (userInfo.roleId) {
      const roleExists = await prisma.role.findUnique({
        where: { id: Number(userInfo.roleId) },
      });

      if (!roleExists) {
        return res.status(404).json({
          message: "El rol seleccionado no existe.",
        });
      }
    }

    const hashedPassword = userInfo.password
      ? await bcrypt.hash(userInfo.password, 10)
      : null;

    await prisma.user.create({
      data: {
        identityDocument: userInfo.identityDocument.trim(),
        documentTypeId: Number(userInfo.documentTypeId),
        firstName: userInfo.firstName.trim(),
        lastName: userInfo.lastName.trim(),
        email: userInfo.email.trim().toLowerCase(),
        phone: userInfo.phone.trim(),
        address: userInfo.address?.trim() || null,
        password: hashedPassword,
        roleId: userInfo.roleId ? Number(userInfo.roleId) : null,
        status: true,
      },
    });

    return res.status(201).json({
      message: "Usuario registrado exitosamente",
    });
  } catch (error) {
    next(error);
  }
};

// 3. ACTUALIZAR INFORMACIÓN DEL USUARIO (PUT /users/:identityDocument)
export const updateUserInfo: RequestHandler<
  { identityDocument: string },
  { message: string },
  {
    userInfo: Omit<User, "identityDocument" | "status" | "createdAt">;
  }
> = async (req, res, next) => {
  try {
    const { identityDocument } = req.params;
    const { userInfo } = req.body;

    const existUser = await prisma.user.findUnique({
      where: { identityDocument },
    });

    if (!existUser) {
      return res.status(404).json({
        message: "No se ha encontrado el usuario indicado.",
      });
    }

    if (userInfo.email) {
      const emailInUse = await prisma.user.findFirst({
        where: {
          email: userInfo.email.trim().toLowerCase(),
          NOT: { identityDocument },
        },
      });

      if (emailInUse) {
        return res.status(400).json({
          message: "El correo electrónico ya pertenece a otro usuario.",
        });
      }
    }

    const dataToUpdate: Prisma.UserUncheckedUpdateInput = {
      documentTypeId: userInfo.documentTypeId ? Number(userInfo.documentTypeId) : undefined,
      firstName: userInfo.firstName?.trim(),
      lastName: userInfo.lastName?.trim(),
      email: userInfo.email ? userInfo.email.trim().toLowerCase() : undefined,
      phone: userInfo.phone?.trim(),
      address: userInfo.address !== undefined ? userInfo.address?.trim() || null : undefined,
      roleId: userInfo.roleId !== undefined ? (userInfo.roleId ? Number(userInfo.roleId) : null) : undefined,
    };

    if (userInfo.password && userInfo.password.trim().length > 0) {
      dataToUpdate.password = await bcrypt.hash(userInfo.password, 10);
    }

    await prisma.user.update({
      data: dataToUpdate,
      where: { identityDocument },
    });

    return res.status(200).json({
      message: "Usuario actualizado exitosamente!",
    });
  } catch (error) {
    next(error);
  }
};

// 4. CAMBIAR ESTADO DEL USUARIO (PATCH /users/status/:identityDocument)
export const updateUserStatus: RequestHandler<
  { identityDocument: string },
  { message: string },
  { status: boolean }
> = async (req, res, next) => {
  try {
    const { identityDocument } = req.params;
    const { status } = req.body;

    const existUser = await prisma.user.findUnique({
      where: { identityDocument },
    });

    if (!existUser) {
      return res.status(404).json({
        message: "No se ha encontrado el usuario indicado.",
      });
    }

    await prisma.user.update({
      data: { status: Boolean(status) },
      where: { identityDocument },
    });

    return res.status(200).json({
      message: "Estado del usuario actualizado exitosamente!",
    });
  } catch (error) {
    next(error);
  }
};

// 5. ELIMINAR USUARIO (DELETE /users/:identityDocument)
export const deleteUser: RequestHandler<
  { identityDocument: string },
  { message: string }
> = async (req, res, next) => {
  try {
    const { identityDocument } = req.params;

    const existUser = await prisma.user.findUnique({
      where: { identityDocument },
      include: {
        _count: {
          select: {
            salesAsCustomer: true,
            salesAsSeller: true,
            payments: true,
            saleReturns: true,
            expenses: true,
          },
        },
      },
    });

    if (!existUser) {
      return res.status(404).json({
        message: "No se ha encontrado el usuario indicado.",
      });
    }

    const totalRelations =
      existUser._count.salesAsCustomer +
      existUser._count.salesAsSeller +
      existUser._count.payments +
      existUser._count.saleReturns +
      existUser._count.expenses;

    if (totalRelations > 0) {
      return res.status(400).json({
        message:
          "No se puede eliminar el usuario porque tiene ventas, abonos, devoluciones o gastos asociados. Cambia su estado a inactivo.",
      });
    }

    await prisma.user.delete({
      where: { identityDocument },
    });

    return res.status(200).json({
      message: "Usuario eliminado exitosamente.",
    });
  } catch (error) {
    next(error);
  }
};