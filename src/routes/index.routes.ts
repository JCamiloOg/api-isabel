import { Router } from "express";
import shoppingRoutes from "../modules/shopping/routes/shopping.routes.js";
import suppliersCategoriesRoutes from "../modules/suppliersCategory/routes/suppliersCategory.routes.js";
import returnsRoutes from "../modules/returns/routes/salesReturns.routes.js";
import clientsRoutes from "../modules/client/routes/client.routes.js"
import productBrandsRoutes from "../modules/product/routes/brandsProduct.routes.js"
import productTypesRoutes from "../modules/product/routes/shoetypes.Product.routes.js"
import productCategoriesRoutes from "../modules/product/routes/categories.Product.routes.js"
import productSizesRoutes from "../modules/product/routes/sizes.Product.routes.js"
import productColorsRoutes from "../modules/product/routes/colors.Product.routes.js"
import productsRoutes from "../modules/product/routes/product.routes.js"
import ordersRoutes from "../modules/orders/routes/orders.routes.js";
import usersRoutes from "../modules/users/routes/users.routes.js"
import rolesRoutes from "../modules/roles/routes/roles.routes.js"
import permissionsRoutes from "../modules/permissions/routes/permissions.routes.js"
import salesRoutes from "../modules/sales/routes/sales.routes.js"
import dashboardRoutes from "../modules/dashboard/routes/dashboard.routes.js";

import boxesRoutes from "../modules/boxes/routers/boxes.routes.js";
import expensesRoutes from "../modules/expenses/routers/expenses.routes.js";
import supplierRoutes from "../modules/suppliers/routers/supplier.routes.js";
const router = Router();

// ── Auth ──
// router.use("/auth", authRoutes);

// ── Dashboard / Principal ──
router.use("/dashboard", dashboardRoutes);
router.use("/expenses", expensesRoutes);
router.use("/boxes", boxesRoutes);

// ── Gestión de compras / Productos ──
router.use("/products", productsRoutes);
router.use("/products/colors", productColorsRoutes);
router.use("/products/sizes", productSizesRoutes);
router.use("/products/categories", productCategoriesRoutes);
router.use("/products/brands", productBrandsRoutes);
router.use("/products/types", productTypesRoutes);
router.use("/category-supplier", suppliersCategoriesRoutes);
router.use("/supplier", supplierRoutes);
router.use("/shoppings", shoppingRoutes);

// ── Gestión de ventas ──
router.use("/clients", clientsRoutes);
router.use("/orders", ordersRoutes);
router.use("/sales", salesRoutes);
router.use("/returns", returnsRoutes);

// ── Configuración / Usuarios y Roles ──
router.use("/users", usersRoutes);
router.use("/roles", rolesRoutes);
router.use("/permissions", permissionsRoutes);

// ── Landing / Clientes ──
// router.use("/catalog", catalogRoutes);
// router.use("/checkout", checkoutRoutes);

export default router;
