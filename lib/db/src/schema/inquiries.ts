import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * Unified inquiries table — stores both general inquiries and medicine requests
 * that were previously written to Firestore's "inquiries" collection.
 *
 * type = "inquiry"          → General contact form (GeneralInquiry.tsx)
 * type = "medicine-request" → RequestMedicine.tsx
 */
export const inquiriesTable = pgTable("inquiries", {
  id:                serial("id").primaryKey(),
  inquiryId:         text("inquiry_id").notNull().unique(), // INQ-... or REQ-...
  type:              text("type", { enum: ["inquiry", "medicine-request"] }).notNull().default("inquiry"),
  customerName:      text("customer_name").notNull(),
  mobileNumber:      text("mobile_number").notNull(),
  whatsappNumber:    text("whatsapp_number"),
  email:             text("email"),
  // General inquiry fields
  subject:           text("subject"),
  message:           text("message"),
  preferredContact:  text("preferred_contact", { enum: ["phone", "whatsapp", "email"] }),
  // Medicine request fields
  medicineName:      text("medicine_name"),
  medicineStrength:  text("medicine_strength"),
  medicineBrand:     text("medicine_brand"),
  quantity:          text("quantity"),
  // Address (medicine requests)
  houseNumber:       text("house_number"),
  street:            text("street"),
  landmark:          text("landmark"),
  pincode:           text("pincode"),
  fullAddress:       text("full_address"),
  deliveryInstructions: text("delivery_instructions"),
  deliveryEligible:  boolean("delivery_eligible"),
  // Files (medicine requests)
  prescriptionUrl:   text("prescription_url"),
  hasPrescription:   boolean("has_prescription").default(false).notNull(),
  medicinePhotoUrl:  text("medicine_photo_url"),
  // Metadata
  source:            text("source", { enum: ["website", "whatsapp", "email"] }).default("website").notNull(),
  status:            text("status").default("pending").notNull(),
  notes:             text("notes"),
  adminNotes:        text("admin_notes"),
  createdAt:         timestamp("created_at").defaultNow().notNull(),
  updatedAt:         timestamp("updated_at").defaultNow().notNull(),
});

export type InsertInquiry = typeof inquiriesTable.$inferInsert;
export type Inquiry = typeof inquiriesTable.$inferSelect;
