import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./models/User.js";
import Lead from "./models/Lead.js";
import Customer from "./models/Customer.js";
import Case from "./models/Case.js";
import ChannelPartner from "./models/ChannelPartner.js";
import BankBranch from "./models/BankBranch.js";

dotenv.config();
await mongoose.connect(process.env.MONGO_URI);

await Promise.all([
  User.deleteMany({}), Lead.deleteMany({}), Customer.deleteMany({}),
  Case.deleteMany({}), ChannelPartner.deleteMany({}), BankBranch.deleteMany({})
]);

await User.create({ name:"Admin", email:"admin@dsa.local", password:"Admin@123", role:"admin" });

await Lead.insertMany([
  { name:"Ravi", mobile:"9876543210", email:"ravi@test.com", source:"Referral", status:"free_pool" },
  { name:"Sita", mobile:"9123456780", email:"sita@test.com", source:"Campaign", status:"archived" },
  { name:"John", mobile:"9988776655", email:"john@test.com", source:"Website", status:"deleted" },
  { name:"Salim", mobile:"9012345678", email:"salim@test.com", source:"Walk-in", status:"assigned" },
  { name:"Neha", mobile:"9090909090", email:"neha@test.com", source:"Facebook", status:"free_pool" }
]);

await Customer.insertMany([
  { customerId:"10001", name:"Amit Kumar", mobile:"9000000001", email:"amit@test.com" },
  { customerId:"10002", name:"Priya Sharma", mobile:"9000000002", email:"priya@test.com" },
  { customerId:"10003", name:"David Lee", mobile:"9000000003", email:"david@test.com" }
]);

await ChannelPartner.insertMany([
  { partnerId:"CP10001", name:"HDFC Bank", contactNumber:"9811111111", products:["Home Loan","Business Loan"], commission:1.5 },
  { partnerId:"CP10002", name:"ICICI Bank", contactNumber:"9822222222", products:["Personal Loan"], commission:2.0 }
]);

await BankBranch.insertMany([
  { branchId:"BB10001", bankName:"HDFC Bank", branchName:"Pune Main", managerNumber:"9877000000" },
  { branchId:"BB10002", bankName:"ICICI Bank", branchName:"Mumbai South", managerNumber:"9877111111" }
]);

await Case.insertMany([
  { caseId:"25040001", loanType:"Home Loan", status:"approved", task:"Docs verified", disbursedAmount:0 },
  { caseId:"25040002", loanType:"Business Loan", status:"disbursed", task:"Funds transferred", disbursedAmount:500000 }
]);

console.log("Seed data inserted. Admin: admin@dsa.local / Admin@123");
process.exit(0);
