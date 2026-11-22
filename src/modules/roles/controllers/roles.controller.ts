import { Prisma, Role } from "@prisma/client";
import { RequestHandler } from "express";
import { prisma } from "../../../config/prisma.js";

// --- Tipos inferidos con Prisma GetPayload ---
type GetRoleByID = Prisma.RoleGetPayload<{
  select: {
    id: true;
    name: true;
    description: true;
    _count: {
      select: {
        users: true;
      };
    };
    rolePrivileges: {
      select: {
        privilegeId: true;
        privilege: {
          select: {
            id: true;
            name: true;
            permissionId: true;
            permission: {
              select: {
                id: true;
                name: true;
              };
            };
          };
        };
      };
    };
  };
}>;

type GetRole = Prisma.RoleGetPayload<{
  select: {
    id: true;
    name: true;
    description: true;
    _count: {
      select: {
        users: true;
      };
    };
    rolePrivileges: {
      select: {
        privilegeId: true;
      };
    };
  };
}>;

type PermissionCatalog = Prisma.PermissionGetPayload<{
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

// 1. OBTENER TODOS LOS ROLES O UN ROL POR ID (GET /roles y GET /roles/:idRole)
export const getRoles: RequestHandler<
  { idRole?: string },
  {
    message: string;
    roles?: GetRole[] | GetRoleByID;
    permissions?: PermissionCatalog[];
  }
> = async (req, res, next) => {
  try {
    const { idRole } = req.params;

    if (idRole) {
      const role = await prisma.role.findUnique({
        select: {
          id: true,
          name: true,
          description: true,
          _count: {
            select: {
              users: true,
            },
          },
          rolePrivileges: {
            select: {
              privilegeId: true,
              privilege: {
                select: {
                  id: true,
                  name: true,
                  permissionId: true,
                  permission: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        where: { id: Number(idRole) },
      });

      if (!role) {
        return res.status(404).json({ message: "No se ha encontrado el rol." });
      }

      return res.status(200).json({
        message: "Rol obtenido exitosamente",
        roles: role,
      });
    }

    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        _count: {
          select: {
            users: true,
          },
        },
        rolePrivileges: {
          select: {
            privilegeId: true,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    // Catálogo de permisos y privilegios para construir la matriz en el frontend
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
      message: "Roles obtenidos exitosamente",
      roles,
      permissions,
    });
  } catch (error) {
    next(error);
  }
};

// 2. CREAR ROL CON SUS PRIVILEGIOS (POST /roles)
export const createRole: RequestHandler<
  unknown,
  { message: string },
  {
    roleInfo: Omit<Role, "id">;
    privilegeIds: number[];
  }
> = async (req, res, next) => {
  try {
    const { roleInfo, privilegeIds } = req.body;

    if (!roleInfo || !roleInfo.name?.trim() || !roleInfo.description?.trim()) {
      return res.status(400).json({
        message: "El nombre y la descripción del rol son obligatorios.",
      });
    }

    if (!privilegeIds || privilegeIds.length === 0) {
      return res.status(400).json({
        message: "Debes asignar al menos un privilegio al rol.",
      });
    }

    const existRoleName = await prisma.role.findUnique({
      where: { name: roleInfo.name.trim() },
    });

    if (existRoleName) {
      return res.status(400).json({
        message: "Ya existe un rol registrado con ese nombre.",
      });
    }

    const uniquePrivilegeIds = Array.from(new Set(privilegeIds.map(Number)));

    await prisma.$transaction(async (tx) => {
      const insertedRole = await tx.role.create({
        data: {
          name: roleInfo.name.trim(),
          description: roleInfo.description.trim(),
        },
      });

      await tx.rolePrivilege.createMany({
        data: uniquePrivilegeIds.map((privilegeId) => ({
          roleId: insertedRole.id,
          privilegeId,
        })),
      });
    });

    return res.status(201).json({
      message: "Rol registrado exitosamente",
    });
  } catch (error) {
    next(error);
  }
};

// 3. ACTUALIZAR ROL Y REEMPLAZAR SUS PRIVILEGIOS (PUT /roles/:idRole)
export const updateRole: RequestHandler<
  { idRole: string },
  { message: string },
  {
    roleInfo: Omit<Role, "id">;
    privilegeIds: number[];
  }
> = async (req, res, next) => {
  try {
    const { idRole } = req.params;
    const { roleInfo, privilegeIds } = req.body;
    const roleIdNum = Number(idRole);

    const existRole = await prisma.role.findUnique({
      where: { id: roleIdNum },
    });

    if (!existRole) {
      return res.status(404).json({
        message: "No se ha encontrado el rol indicado.",
      });
    }

    if (!roleInfo || !roleInfo.name?.trim() || !roleInfo.description?.trim()) {
      return res.status(400).json({
        message: "El nombre y la descripción del rol son obligatorios.",
      });
    }

    if (!privilegeIds || privilegeIds.length === 0) {
      return res.status(400).json({
        message: "Debes asignar al menos un privilegio al rol.",
      });
    }

    const duplicateName = await prisma.role.findFirst({
      where: {
        name: roleInfo.name.trim(),
        NOT: { id: roleIdNum },
      },
    });

    if (duplicateName) {
      return res.status(400).json({
        message: "Ya existe otro rol con ese nombre.",
      });
    }

    const uniquePrivilegeIds = Array.from(new Set(privilegeIds.map(Number)));

    await prisma.$transaction(async (tx) => {
      await tx.role.update({
        data: {
          name: roleInfo.name.trim(),
          description: roleInfo.description.trim(),
        },
        where: { id: roleIdNum },
      });

      await tx.rolePrivilege.deleteMany({
        where: { roleId: roleIdNum },
      });

      await tx.rolePrivilege.createMany({
        data: uniquePrivilegeIds.map((privilegeId) => ({
          roleId: roleIdNum,
          privilegeId,
        })),
      });
    });

    return res.status(200).json({
      message: "Rol actualizado exitosamente!",
    });
  } catch (error) {
    next(error);
  }
};

// 4. ELIMINAR ROL (DELETE /roles/:idRole)
export const deleteRole: RequestHandler<
  { idRole: string },
  { message: string }
> = async (req, res, next) => {
  try {
    const { idRole } = req.params;
    const roleIdNum = Number(idRole);

    const existRole = await prisma.role.findUnique({
      where: { id: roleIdNum },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!existRole) {
      return res.status(404).json({
        message: "No se ha encontrado el rol indicado.",
      });
    }

    if (existRole._count.users > 0) {
      return res.status(400).json({
        message: `No se puede eliminar el rol porque tiene ${existRole._count.users} usuario(s) asignado(s).`,
      });
    }

    await prisma.role.delete({
      where: { id: roleIdNum },
    });

    return res.status(200).json({
      message: "Rol eliminado exitosamente.",
    });
  } catch (error) {
    next(error);
  }
};