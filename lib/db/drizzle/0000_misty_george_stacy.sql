CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"firebase_uid" text,
	"email" text NOT NULL,
	"display_name" text,
	"role" text DEFAULT 'admin' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_firebase_uid_unique" UNIQUE("firebase_uid"),
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firebase_uid" text,
	"email" text,
	"display_name" text,
	"phone" text,
	"role" text DEFAULT 'customer' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"image_url" text,
	"icon" text DEFAULT '💊' NOT NULL,
	"color" text DEFAULT 'primary' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"collection_type" text DEFAULT 'medicine' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "drug_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "drug_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "medicines" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_code" integer NOT NULL,
	"name" text NOT NULL,
	"generic_name" text,
	"company_id" integer,
	"category_id" integer,
	"drug_group_id" integer,
	"packing" text,
	"mrp" numeric(10, 2),
	"selling_price" numeric(10, 2),
	"discount" numeric(5, 2),
	"prescription_required" boolean DEFAULT false NOT NULL,
	"stock_status" text DEFAULT 'out_of_stock' NOT NULL,
	"stock_qty" integer DEFAULT 0 NOT NULL,
	"image_url" text,
	"featured" boolean DEFAULT false NOT NULL,
	"new_arrival" boolean DEFAULT false NOT NULL,
	"special" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "medicines_product_code_unique" UNIQUE("product_code")
);
--> statement-breakpoint
CREATE TABLE "stock" (
	"id" serial PRIMARY KEY NOT NULL,
	"medicine_id" integer NOT NULL,
	"batch_no" text,
	"expiry" text,
	"quantity" integer DEFAULT 0 NOT NULL,
	"purchase_price" numeric(10, 2),
	"selling_price" numeric(10, 2),
	"mrp" numeric(10, 2),
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"reorder_level" integer DEFAULT 10 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_product_id_unique" UNIQUE("product_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"brand" text,
	"description" text,
	"image_url" text,
	"category_id" integer,
	"stock_status" text DEFAULT 'in_stock' NOT NULL,
	"selling_price" numeric(10, 2),
	"mrp" numeric(10, 2),
	"discount_percent" numeric(5, 2),
	"show_in_new_arrivals" boolean DEFAULT false NOT NULL,
	"show_in_special_medicines" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "vet_medicines" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"generic_name" text,
	"brand" text,
	"category_id" integer,
	"animal_type" text,
	"prescription_required" boolean DEFAULT false NOT NULL,
	"packing" text,
	"mrp" numeric(10, 2),
	"selling_price" numeric(10, 2),
	"discount" numeric(5, 2),
	"stock_status" text DEFAULT 'out_of_stock' NOT NULL,
	"stock_qty" integer DEFAULT 0 NOT NULL,
	"image_url" text,
	"featured" boolean DEFAULT false NOT NULL,
	"new_arrival" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "general_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"description" text,
	"category_id" integer,
	"sub_category" text,
	"packing" text,
	"mrp" numeric(10, 2),
	"selling_price" numeric(10, 2),
	"discount" numeric(5, 2),
	"stock_status" text DEFAULT 'in_stock' NOT NULL,
	"stock_qty" integer DEFAULT 0 NOT NULL,
	"image_url" text,
	"featured" boolean DEFAULT false NOT NULL,
	"new_arrival" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"full_name" text NOT NULL,
	"mobile_number" text NOT NULL,
	"alternate_number" text,
	"house_number" text NOT NULL,
	"building_name" text,
	"street" text NOT NULL,
	"area" text,
	"landmark" text,
	"delivery_instructions" text,
	"pincode" text NOT NULL,
	"city" text DEFAULT 'Mumbai' NOT NULL,
	"state" text DEFAULT 'Maharashtra' NOT NULL,
	"address_type" text DEFAULT 'home' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"lat" numeric(10, 6),
	"lng" numeric(10, 6),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"discount_type" text NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"minimum_order_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"maximum_discount" numeric(10, 2),
	"usage_limit" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"valid_from" timestamp,
	"valid_until" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "order_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"order_db_id" integer,
	"customer_id" text NOT NULL,
	"event" text NOT NULL,
	"event_label" text,
	"channels" jsonb NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"medicine_id" text,
	"medicine_name" text NOT NULL,
	"category_name" text,
	"brand_name" text,
	"image_url" text,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"prescription_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"customer_phone" text NOT NULL,
	"address" jsonb NOT NULL,
	"pricing" jsonb NOT NULL,
	"payment" jsonb NOT NULL,
	"prescription" jsonb NOT NULL,
	"delivery" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"source" text DEFAULT 'website' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"inquiry_id" text NOT NULL,
	"type" text DEFAULT 'inquiry' NOT NULL,
	"customer_name" text NOT NULL,
	"mobile_number" text NOT NULL,
	"customer_id" text,
	"whatsapp_number" text,
	"email" text,
	"subject" text,
	"message" text,
	"preferred_contact" text,
	"medicine_name" text,
	"medicine_strength" text,
	"medicine_brand" text,
	"quantity" text,
	"house_number" text,
	"street" text,
	"landmark" text,
	"pincode" text,
	"full_address" text,
	"delivery_instructions" text,
	"delivery_eligible" boolean,
	"prescription_url" text,
	"has_prescription" boolean DEFAULT false NOT NULL,
	"medicine_photo_url" text,
	"medicine_price" numeric(10, 2),
	"delivery_charge" numeric(10, 2),
	"discount" numeric(10, 2),
	"grand_total" numeric(10, 2),
	"payment_status" text,
	"source" text DEFAULT 'website' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"admin_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inquiries_inquiry_id_unique" UNIQUE("inquiry_id")
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"content" text NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_chunks" (
	"session_id" text NOT NULL,
	"file_key" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"total_chunks" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "upload_chunks_session_id_file_key_chunk_index_pk" PRIMARY KEY("session_id","file_key","chunk_index")
);
--> statement-breakpoint
CREATE TABLE "sync_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"firebase_uid" text NOT NULL,
	"status" text DEFAULT 'uploading' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_drug_group_id_drug_groups_id_fk" FOREIGN KEY ("drug_group_id") REFERENCES "public"."drug_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock" ADD CONSTRAINT "stock_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vet_medicines" ADD CONSTRAINT "vet_medicines_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "general_products" ADD CONSTRAINT "general_products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_notifications" ADD CONSTRAINT "order_notifications_order_db_id_orders_id_fk" FOREIGN KEY ("order_db_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "medicines_category_idx" ON "medicines" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "medicines_company_idx" ON "medicines" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "medicines_stock_status_idx" ON "medicines" USING btree ("stock_status");--> statement-breakpoint
CREATE INDEX "medicines_featured_idx" ON "medicines" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "medicines_new_arrival_idx" ON "medicines" USING btree ("new_arrival");--> statement-breakpoint
CREATE INDEX "medicines_special_idx" ON "medicines" USING btree ("special");--> statement-breakpoint
CREATE INDEX "medicines_name_idx" ON "medicines" USING btree ("name");--> statement-breakpoint
CREATE INDEX "vet_medicines_category_idx" ON "vet_medicines" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "vet_medicines_status_idx" ON "vet_medicines" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vet_medicines_name_idx" ON "vet_medicines" USING btree ("name");--> statement-breakpoint
CREATE INDEX "vet_medicines_animal_type_idx" ON "vet_medicines" USING btree ("animal_type");--> statement-breakpoint
CREATE INDEX "vet_medicines_featured_idx" ON "vet_medicines" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "general_products_category_idx" ON "general_products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "general_products_status_idx" ON "general_products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "general_products_name_idx" ON "general_products" USING btree ("name");--> statement-breakpoint
CREATE INDEX "general_products_sub_category_idx" ON "general_products" USING btree ("sub_category");--> statement-breakpoint
CREATE INDEX "general_products_featured_idx" ON "general_products" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "sync_sessions_firebase_uid_idx" ON "sync_sessions" USING btree ("firebase_uid");--> statement-breakpoint
CREATE UNIQUE INDEX "sync_sessions_one_active_per_user_idx" ON "sync_sessions" USING btree ("firebase_uid") WHERE "sync_sessions"."status" in ('uploading', 'running');