import express from "express";
import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import Case from "../models/Case.js";
import Customer from "../models/Customer.js";
import AuditLog from "../models/AuditLog.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

/* ================================
   📅 Enhanced Date Range Parser
================================ */
function parseRange(req) {
  let { from, to, timeRange = "month", month, year } = req.query;
  const now = new Date();
  let dFrom, dTo;

  if (month && year) {
    const m = parseInt(month) - 1;
    const y = parseInt(year);
    dFrom = new Date(y, m, 1);
    dTo = new Date(y, m + 1, 0);
  } else if (timeRange === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), q * 3, 1);
    dFrom = from ? new Date(from) : start;
    dTo = to ? new Date(to) : new Date(start.getFullYear(), start.getMonth() + 3, 0);
  } else if (timeRange === "year") {
    const y = year ? parseInt(year) : now.getFullYear();
    dFrom = new Date(y, 0, 1);
    dTo = new Date(y, 11, 31);
  } else {
    const m = month ? parseInt(month) - 1 : now.getMonth();
    const y = year ? parseInt(year) : now.getFullYear();
    dFrom = new Date(y, m, 1);
    dTo = new Date(y, m + 1, 0);
  }

  dFrom.setHours(0, 0, 0, 0);
  dTo.setHours(23, 59, 59, 999);

  console.log("📅 Parsed Range:", { dFrom, dTo });
  return { from: dFrom, to: dTo, timeRange };
}

/* ================================
   📊 Metrics Overview (Main)
================================ */
router.get("/overview", auth, async (req, res) => {
  try {
    console.log("🔍 Metrics overview called with query:", req.query);
    const { from, to, timeRange } = parseRange(req);
    const partner = req.query.partner?.trim();
    const bank = req.query.bank?.trim();
    const branch = req.query.branch?.trim();
    const leadType = req.query.leadType?.trim();
    const subType = req.query.subType?.trim();

    // Base filters
    const leadMatch = { createdAt: { $gte: from, $lte: to } };
    const caseMatch = { createdAt: { $gte: from, $lte: to } };
    const custMatch = { createdAt: { $gte: from, $lte: to } };

    if (leadType) leadMatch.leadType = leadType;
    if (subType) leadMatch.subType = subType;
    if (bank) caseMatch.bank = bank;
    if (branch) {
      leadMatch.branch = branch;
      caseMatch.branch = branch;
      custMatch.branch = branch;
    }

    /* ============================
       🧮 FREE POOL FIXED CALCULATION
    ============================ */
    const [
      totalLeads,
      archivedLeads,
      convertedToCasesIds
    ] = await Promise.all([
      Lead.countDocuments(leadMatch),
      Lead.countDocuments({
        ...leadMatch,
        status: { $in: ["archived", "rejected"] },
      }),
      Case.distinct("leadId", caseMatch),
    ]);

    // Leads not converted + not archived/rejected/deleted
    const freePoolLeads = await Lead.find({
      ...leadMatch,
      status: { $nin: ["archived", "rejected"] },
      deleted: { $ne: true },
      leadId: { $nin: convertedToCasesIds },
    }).select("leadId").lean();

    const freePoolCount = freePoolLeads.length;
    console.log("✅ Free Pool:", { totalLeads, archivedLeads, converted: convertedToCasesIds.length, freePoolCount });

    /* ============================
       📊 OTHER COUNTS
    ============================ */
    const [
      casesTotal,
      customersOpen,
      customersClose,
      totalDisbursedAgg,
      requirementAgg
    ] = await Promise.all([
      Case.countDocuments(caseMatch),
      Customer.countDocuments({ ...custMatch, status: "open" }),
      Customer.countDocuments({ ...custMatch, status: "close" }),
      Customer.aggregate([
        { $match: custMatch },
        { $unwind: { path: "$disbursements", preserveNullAndEmptyArrays: true } },
        { $match: { "disbursements.amount": { $exists: true, $ne: null } } },
        { $addFields: { "disbursements.amount": { $toDouble: "$disbursements.amount" } } },
        { $group: { _id: null, total: { $sum: "$disbursements.amount" } } }
      ]),
      Case.aggregate([
        { $match: caseMatch },
        { $group: { _id: null, total: { $sum: "$requirementAmount" } } }
      ])
    ]);

    const totalDisbursed = totalDisbursedAgg?.[0]?.total || 0;
    const totalRequirement = requirementAgg?.[0]?.total || 0;

    /* ============================
       💹 TIME SERIES
    ============================ */
    const timeGrouping = timeRange === "year"
      ? { year: { $year: "$createdAt" } }
      : timeRange === "quarter"
      ? { year: { $year: "$createdAt" }, quarter: { $ceil: { $divide: [{ $month: "$createdAt" }, 3] } } }
      : { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } };

    const [leadsSeries, casesSeries, disbSeries, reqSeries] = await Promise.all([
      Lead.aggregate([
        { $match: leadMatch },
        { $group: { _id: timeGrouping, count: { $sum: 1 } } },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.quarter": 1 } }
      ]),
      Case.aggregate([
        { $match: caseMatch },
        { $group: { _id: timeGrouping, count: { $sum: 1 } } },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.quarter": 1 } }
      ]),
      Customer.aggregate([
        { $match: custMatch },
        { $unwind: { path: "$disbursements", preserveNullAndEmptyArrays: true } },
        { $match: { "disbursements.date": { $gte: from, $lte: to } } },
        { $addFields: { "disbursements.amount": { $toDouble: "$disbursements.amount" } } },
        { $group: { _id: timeGrouping, total: { $sum: "$disbursements.amount" } } },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.quarter": 1 } }
      ]),
      Case.aggregate([
        { $match: caseMatch },
        { $group: { _id: timeGrouping, total: { $sum: "$requirementAmount" } } },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.quarter": 1 } }
      ])
    ]);

    /* ============================
       📊 BREAKDOWNS
    ============================ */
    const [leadTypeBreakdown, subTypeBreakdown, bankCounts, partnerCounts, branchCounts] = await Promise.all([
      Lead.aggregate([{ $match: leadMatch }, { $group: { _id: "$leadType", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Lead.aggregate([{ $match: leadMatch }, { $group: { _id: "$subType", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Case.aggregate([{ $match: caseMatch }, { $group: { _id: "$bank", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Lead.aggregate([{ $match: leadMatch }, { $group: { _id: "$channelPartner", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Lead.aggregate([{ $match: leadMatch }, { $group: { _id: "$branch", count: { $sum: 1 } } }, { $sort: { count: -1 } }])
    ]);

    /* ============================
       🧾 RECENT ACTIVITY
    ============================ */
    const [recentLeads, recentCases, recentCustomers, recentLogs] = await Promise.all([
      Lead.find(leadMatch).sort({ createdAt: -1 }).limit(5).select("leadId name mobile status createdAt").lean(),
      Case.find(caseMatch).sort({ createdAt: -1 }).limit(5).select("caseId customerName amount status createdAt").lean(),
      Customer.find(custMatch).sort({ createdAt: -1 }).limit(5).select("customerId name status createdAt").lean(),
      AuditLog.find({ createdAt: { $gte: from, $lte: to } }).sort({ createdAt: -1 }).limit(10).populate("actor", "name email role").lean()
    ]);

    /* ============================
       💰 COMMISSION + CONVERSION
    ============================ */
    const calcCommission = (totalDisbursed) => {
      if (!totalDisbursed || totalDisbursed <= 0) return 0;

      // Average rate between 0.7% and 1.0% (smooth linear growth)
      const minRate = 0.007;
      const maxRate = 0.01;

      // As disbursed grows up to ₹1Cr, rate increases linearly from 0.7% to 1%
      const normalized = Math.min(totalDisbursed / 10000000, 1);
      const appliedRate = minRate + (maxRate - minRate) * normalized;

      return totalDisbursed * appliedRate;
    };

    const salesCommission = calcCommission(totalDisbursed);
    const avgCommissionRate = totalDisbursed > 0 ? (salesCommission / totalDisbursed) * 100 : 0;

    const conversionRate =
      totalLeads > 0
        ? Math.round(((customersOpen + customersClose) / totalLeads) * 100)
        : 0;

    /* ============================
       📦 FINAL RESPONSE
    ============================ */
    const response = {
      range: { from, to, timeRange },
      kpis: {
        leadsTotal: totalLeads,
        leadsArchived: archivedLeads,
        leadsDeleted: await Lead.countDocuments({ ...leadMatch, deleted: true }),
        freePoolCount,

        casesTotal,
        customersOpen,
        customersClose,

        totalRequirement,
        totalDisbursed,
        eligibilityGap: Math.max(totalRequirement - totalDisbursed, 0),

        conversionRate,
        avgLeadToCaseDays: 15,
        avgCaseToDisbDays: 30,

        salesCommission: Math.round(salesCommission),
        avgCommissionRate: parseFloat(avgCommissionRate.toFixed(2)),

        predictedNextMonthDisbursement: Math.round(totalDisbursed * 1.1),
      },
      funnel: {
        leads: totalLeads,
        cases: casesTotal,
        customers: customersOpen + customersClose,
        freePool: freePoolCount,
      },
      series: {
        leads: leadsSeries,
        cases: casesSeries,
        disbursements: disbSeries,
        requirements: reqSeries,
      },
      breakdowns: {
        caseStatus: await Case.aggregate([
          { $match: caseMatch },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        leadType: leadTypeBreakdown,
        subType: subTypeBreakdown,
        partners: partnerCounts,
        banks: bankCounts,
        branches: branchCounts,
      },
      recent: {
        leads: recentLeads,
        cases: recentCases,
        customers: recentCustomers,
        logs: recentLogs,
      },
    };

    console.log("✅ Metrics ready:", {
      leads: totalLeads,
      freePool: freePoolCount,
      disbursed: totalDisbursed,
      conversionRate,
      avgCommissionRate,
    });

    res.json(response);
  } catch (e) {
    console.error("💥 Metrics overview error:", e);
    res.status(500).json({ error: "Internal server error", message: e.message });
  }
});

/* ================================
   📅 Time Options
================================ */
router.get("/time-options", auth, async (req, res) => {
  try {
    const months = await Lead.aggregate([
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } } } },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 24 },
    ]);

    const years = await Lead.aggregate([
      { $group: { _id: { year: { $year: "$createdAt" } } } },
      { $sort: { "_id.year": -1 } },
    ]);

    res.json({
      months: months.map((m) => ({
        year: m._id.year,
        month: m._id.month,
        label: `${m._id.year}-${String(m._id.month).padStart(2, "0")}`,
      })),
      years: years.map((y) => y._id.year),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
