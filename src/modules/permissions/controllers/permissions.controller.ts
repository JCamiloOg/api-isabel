import { Prisma } from "@prisma/client";
import { RequestHandler } from "express";
import { prisma } from "../../../config/prisma.js";

// --- Tipo inferido con Prisma GetPayload ---
type GetPermissionWithPrivileges = Prisma.PermissionGetPayload<{
  select: {
    id: true;
    name: true;
    privileges: {
      select: {
        id: true;
        permissionId: true;
        name: true;
      };
    };
  };
}>;

// OBTENER TODOS LOS PERMISOS (MÓDULOS) Y SUS PRIVILEGIOS (ACCIONES) (GET /permissions y GET /permissions/:idPermission)
export const getPermissions: RequestHandler<
  { idPermission?: string },
  {
    message: string;
    permissions?: GetPermissionWithPrivileges[] | GetPermissionWithPrivileges;
  }
> = async (req, res, next) => {
  try {
    const { idPermission } = req.params;

    if (idPermission) {
      const permission = await prisma.permission.findUnique({
        select: {
          id: true,
          name: true,
          privileges: {
            select: {
              id: true,
              permissionId: true,
              name: true,
            },
            orderBy: {
              id: "asc",
            },
          },
        },
        where: { id: Number(idPermission) },
      });

      if (!permission) {
        return res.status(404).json({ message: "No se ha encontrado el permiso." });
      }

      return res.status(200).json({
        message: "Permiso obtenido exitosamente",
        permissions: permission,
      });
    }

    const permissions = await prisma.permission.findMany({
      select: {
        id: true,
        name: true,
        privileges: {
          select: {
            id: true,
            permissionId: true,
            name: true,
          },
          orderBy: {
            id: "asc",
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    return res.status(200).json({
      message: "Permisos obtenidos exitosamente",
      permissions,
    });
  } catch (error) {
    next(error);
  }
};