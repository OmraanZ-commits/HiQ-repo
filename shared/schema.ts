import { sql } from "drizzle-orm";
import { pgTable, text, varchar, date, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const STATUS_FLOW = [
  "Draft",
  "Active",
  "Pricing Updated",
  "Production Started",
  "FTR Approved",
  "Stock Movement Initiated",
  "CBU Ready for Transition",
] as const;

export const networkEntries = pgTable("network_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cbuCreatedDate: date("cbu_created_date"),
  networkChangeDate: date("network_change_date"),
  annexureNumber: text("annexure_number"),
  basepack: text("basepack"),
  basepackDescription: text("basepack_description"),
  bg: text("bg"),
  profitCentre: text("profit_centre"),
  salesCategory: text("sales_category"),
  smallC: text("small_c"),
  brand: text("brand"),
  format: text("format"),
  cbuCode: text("cbu_code"),
  materialDescription: text("material_description"),
  typeOfNetwork: text("type_of_network"),
  copyCbu: text("copy_cbu"),
  year: integer("year"),
  networkStatus: text("network_status").default("Draft"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  caseConfig: text("case_config"),
  ean: text("ean"),
  netWeight: real("net_weight"),
  grossWeight: real("gross_weight"),
  length: real("length"),
  width: real("width"),
  height: real("height"),
  itf: text("itf"),
  ftrImagesLink: text("ftr_images_link"),
  predecessorCode: text("predecessor_code"),
  successorCode: text("successor_code"),
  headerCode: text("header_code"),
  csdIndexNo: text("csd_index_no"),
  pcAtChannelState: text("pc_at_channel_state"),
  sourcingMatrixSection: text("sourcing_matrix_section"),
  assignedPerson: text("assigned_person"),
  geography: text("geography").array(),
  depot: text("depot").array(),
  channel: text("channel").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNetworkEntrySchema = createInsertSchema(networkEntries).omit({
  id: true,
  createdAt: true,
});

export type InsertNetworkEntry = z.infer<typeof insertNetworkEntrySchema>;
export type NetworkEntry = typeof networkEntries.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
