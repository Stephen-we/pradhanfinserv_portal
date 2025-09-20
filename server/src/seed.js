// server/src/seed.js
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Models
import User from "./models/User.js";
import Lead from "./models/Lead.js";
import Customer from "./models/Customer.js";
import Case from "./models/Case.js";
import ChannelPartner from "./models/ChannelPartner.js";
import BankBranch from "./models/BankBranch.js";

// ✅ Load .env from /server/.env
dotenv.config({ path: "./.env" });

if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI not found. Check your server/.env file");
  process.exit(1);
}

console.log("🌐 Connecting to:", process.env.MONGO_URI);
await mongoose.connect(process.env.MONGO_URI);

const superAdminEmail = "super@dsa.local";
const superAdminPass = "Super@123";

let superAdmin = await User.findOne({ email: superAdminEmail });
if (!superAdmin) {
  superAdmin = await User.create({
    name: "Super Admin",
    email: superAdminEmail,
    password: superAdminPass,
    role: "superadmin",
  });
  console.log("✅ Super Admin created:", superAdminEmail, "/", superAdminPass);
} else {
  console.log("ℹ️ Super Admin already exists:", superAdminEmail);
}

// --- Ensure Admin Exists ---
const adminEmail = "admin@dsa.local";
const adminPass = "Admin@123";

let admin = await User.findOne({ email: adminEmail });
if (!admin) {
  admin = await User.create({
    name: "Admin",
    email: adminEmail,
    password: adminPass,   // plain text, will be hashed by pre-save
    role: "admin",
  });
  console.log("✅ Admin created:", adminEmail, "/", adminPass);
} else {    
  console.log("ℹ️ Admin already exists:", adminEmail);
}

// --- Different behavior for prod vs dev ---
if (process.env.NODE_ENV === "production") {
  console.log("🚀 Production mode: only ensured admin, skipped demo data.");
} else {
  console.log("⚡ Development mode: wiping & inserting demo data...");

  await Promise.all([
    Lead.deleteMany({}),
    Customer.deleteMany({}),
    Case.deleteMany({}),
    ChannelPartner.deleteMany({}),
    BankBranch.deleteMany({}),
  ]);

  // ✅ Use `new Lead().save()` instead of insertMany to trigger pre-save hook
  const demoLeads = [
    { name: "Ravi", mobile: "9876543210", email: "ravi@test.com", source: "Referral", status: "free_pool" },
    { name: "Sita", mobile: "9123456780", email: "sita@test.com", source: "Campaign", status: "archived" },
    { name: "John", mobile: "9988776655", email: "john@test.com", source: "Website", status: "deleted" },
    { name: "Salim", mobile: "9012345678", email: "salim@test.com", source: "Walk-in", status: "assigned" },
    { name: "Neha", mobile: "9090909090", email: "neha@test.com", source: "Facebook", status: "free_pool" },
  ];
  for (const lead of demoLeads) {
    await new Lead(lead).save();  // ✅ unique leadId will be generated
  }

  await Customer.insertMany([
    { customerId: "10001", name: "Amit Kumar", mobile: "9000000001", email: "amit@test.com" },
    { customerId: "10002", name: "Priya Sharma", mobile: "9000000002", email: "priya@test.com" },
    { customerId: "10003", name: "David Lee", mobile: "9000000003", email: "david@test.com" },
  ]);

  await ChannelPartner.insertMany([
    { partnerId: "CP10001", name: "HDFC Bank", contactNumber: "9811111111", products: ["Home Loan", "Business Loan"], commission: 1.5 },
    { partnerId: "CP10002", name: "ICICI Bank", contactNumber: "9822222222", products: ["Personal Loan"], commission: 2.0 },
  ]);

  await BankBranch.insertMany([
    { branchId: "BB10001", bankName: "HDFC Bank", branchName: "Pune Main", managerNumber: "9877000000" },
    { branchId: "BB10002", bankName: "ICICI Bank", branchName: "Mumbai South", managerNumber: "9877111111" },
  ]);

  await Case.insertMany([
    { caseId: "25040001", loanType: "Home Loan", status: "approved", task: "Docs verified", disbursedAmount: 0 },
    { caseId: "25040002", loanType: "Business Loan", status: "disbursed", task: "Funds transferred", disbursedAmount: 500000 },
  ]);

  console.log("✅ Demo data inserted.");
}

console.log("✅ Seeding complete. Admin login:", adminEmail, "/", adminPass);
process.exit(0);
