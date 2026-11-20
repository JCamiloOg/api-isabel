-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "description" VARCHAR(255) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(80) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privileges" (
    "id" SERIAL NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "privileges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_privileges" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "privilege_id" INTEGER NOT NULL,

    CONSTRAINT "role_privileges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_types" (
    "id" SERIAL NOT NULL,
    "document_type" VARCHAR(20) NOT NULL,

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "identity_document" VARCHAR(20) NOT NULL,
    "document_type_id" INTEGER NOT NULL,
    "first_name" VARCHAR(120) NOT NULL,
    "last_name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "address" VARCHAR(255),
    "password" VARCHAR(200),
    "role_id" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("identity_document")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(255) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'Active',

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shoe_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "shoe_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "sku" VARCHAR(50),
    "name" VARCHAR(120) NOT NULL,
    "product_category_id" INTEGER NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "shoe_type_id" INTEGER NOT NULL,
    "purchase_price" DECIMAL(12,2) NOT NULL,
    "sale_price" DECIMAL(12,2) NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "gender" VARCHAR(10) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'Active',

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colors" (
    "id" SERIAL NOT NULL,
    "color" VARCHAR(50) NOT NULL,
    "hex" VARCHAR(50) NOT NULL,

    CONSTRAINT "colors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_colors" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "color_id" INTEGER NOT NULL,
    "image" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'Active',

    CONSTRAINT "product_colors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "color_images" (
    "id" SERIAL NOT NULL,
    "product_color_id" INTEGER NOT NULL,
    "image" VARCHAR(255),

    CONSTRAINT "color_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sizes" (
    "id" SERIAL NOT NULL,
    "size_number" VARCHAR(10) NOT NULL,
    "gender" VARCHAR(10) NOT NULL,
    "international_size" VARCHAR(10) NOT NULL,

    CONSTRAINT "sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" SERIAL NOT NULL,
    "product_color_id" INTEGER NOT NULL,
    "size_id" INTEGER NOT NULL,
    "current_stock" INTEGER NOT NULL DEFAULT 0,
    "discount" DECIMAL(5,2) DEFAULT 0.00,
    "status" VARCHAR(20) NOT NULL DEFAULT 'Active',

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(255) NOT NULL,

    CONSTRAINT "supplier_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "document" VARCHAR(20) NOT NULL,
    "document_type_id" INTEGER NOT NULL,
    "supplier_type" VARCHAR(30) NOT NULL,
    "business_name" VARCHAR(150) NOT NULL,
    "is_imported" BOOLEAN NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "address" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'Active',

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("document")
);

-- CreateTable
CREATE TABLE "suppliers_categories" (
    "supplier_category_id" INTEGER NOT NULL,
    "supplier_id" VARCHAR(20) NOT NULL,

    CONSTRAINT "suppliers_categories_pkey" PRIMARY KEY ("supplier_category_id","supplier_id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" UUID NOT NULL,
    "cash_register_id" INTEGER NOT NULL,
    "supplier_id" VARCHAR(20) NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) NOT NULL DEFAULT 'Pending',
    "delivery_date" TIMESTAMP(3),
    "vat" DECIMAL(5,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_details" (
    "id" SERIAL NOT NULL,
    "purchase_id" UUID NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "purchase_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" UUID NOT NULL,
    "customer_id" VARCHAR(20) NOT NULL,
    "user_id" VARCHAR(20) NOT NULL,
    "sale_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "is_credit" BOOLEAN NOT NULL,
    "is_direct_sale" BOOLEAN,
    "vat" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "status" VARCHAR(20) NOT NULL DEFAULT 'Completed',

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_details" (
    "id" SERIAL NOT NULL,
    "sale_id" UUID NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "sale_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" SERIAL NOT NULL,
    "method" VARCHAR(20) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "sale_id" UUID NOT NULL,
    "cash_register_id" INTEGER NOT NULL,
    "user_id" VARCHAR(20) NOT NULL,
    "payment_method_id" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "receipt" VARCHAR(255),
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" VARCHAR(255),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_returns" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "user_id" VARCHAR(20) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" VARCHAR(100) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'Pending Review',
    "rejection_reason" VARCHAR(255),
    "request_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolution_date" TIMESTAMP(3),

    CONSTRAINT "sale_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_registers" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "register_type" VARCHAR(30) NOT NULL,
    "current_balance" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "details" VARCHAR(20) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" SERIAL NOT NULL,
    "concept" VARCHAR(150) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" DATE NOT NULL,
    "user_id" VARCHAR(20) NOT NULL,
    "cash_register_id" INTEGER NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "idx_unique_permission_action" ON "privileges"("permission_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "role_privileges_role_id_privilege_id_key" ON "role_privileges"("role_id", "privilege_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_name_key" ON "product_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_key" ON "brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_colors_product_id_color_id_key" ON "product_colors"("product_id", "color_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_product_color_id_size_id_key" ON "product_variants"("product_color_id", "size_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_categories_name_key" ON "supplier_categories"("name");

-- AddForeignKey
ALTER TABLE "privileges" ADD CONSTRAINT "privileges_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_privileges" ADD CONSTRAINT "role_privileges_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_privileges" ADD CONSTRAINT "role_privileges_privilege_id_fkey" FOREIGN KEY ("privilege_id") REFERENCES "privileges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_product_category_id_fkey" FOREIGN KEY ("product_category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_shoe_type_id_fkey" FOREIGN KEY ("shoe_type_id") REFERENCES "shoe_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_colors" ADD CONSTRAINT "product_colors_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_colors" ADD CONSTRAINT "product_colors_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "color_images" ADD CONSTRAINT "color_images_product_color_id_fkey" FOREIGN KEY ("product_color_id") REFERENCES "product_colors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_color_id_fkey" FOREIGN KEY ("product_color_id") REFERENCES "product_colors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_size_id_fkey" FOREIGN KEY ("size_id") REFERENCES "sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers_categories" ADD CONSTRAINT "suppliers_categories_supplier_category_id_fkey" FOREIGN KEY ("supplier_category_id") REFERENCES "supplier_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers_categories" ADD CONSTRAINT "suppliers_categories_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("document") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "cash_registers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("document") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_details" ADD CONSTRAINT "purchase_details_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_details" ADD CONSTRAINT "purchase_details_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("identity_document") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("identity_document") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_details" ADD CONSTRAINT "sale_details_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_details" ADD CONSTRAINT "sale_details_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "cash_registers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("identity_document") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("identity_document") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("identity_document") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "cash_registers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
