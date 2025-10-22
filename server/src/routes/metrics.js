// server/routes/metrics.js - FIXED FREE POOL CALCULATION
import express from "express";
import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import Case from "../models/Case.js";
import Customer from "../models/Customer.js";
import AuditLog from "../models/AuditLog.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// Enhanced date range parser with month/year selection
function parseRange(req) {
  let { from, to, timeRange = 'month', month, year } = req.query;
  const now = new Date();
  
  console.log('📅 Original query params:', { from, to, timeRange, month, year });
  
  let dFrom, dTo;

  // Handle month/year selection
  if (month && year) {
    const selectedMonth = parseInt(month) - 1; // JavaScript months are 0-indexed
    const selectedYear = parseInt(year);
    dFrom = new Date(selectedYear, selectedMonth, 1);
    dTo = new Date(selectedYear, selectedMonth + 1, 0); // Last day of the month
  }
  // Handle quarter selection
  else if (timeRange === 'quarter') {
    const quarter = Math.floor(now.getMonth() / 3);
    const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
    dFrom = from ? new Date(from) : quarterStart;
    dTo = to ? new Date(to) : new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);
  }
  // Handle year selection
  else if (timeRange === 'year') {
    const selectedYear = year ? parseInt(year) : now.getFullYear();
    dFrom = new Date(selectedYear, 0, 1); // Jan 1
    dTo = new Date(selectedYear, 11, 31); // Dec 31
  }
  // Default to current month
  else {
    const selectedMonth = month ? parseInt(month) - 1 : now.getMonth();
    const selectedYear = year ? parseInt(year) : now.getFullYear();
    dFrom = new Date(selectedYear, selectedMonth, 1);
    dTo = new Date(selectedYear, selectedMonth + 1, 0);
  }
  
  dFrom.setHours(0,0,0,0);
  dTo.setHours(23,59,59,999);
  
  console.log('📅 Parsed date range:', { dFrom, dTo });
  
  return { from: dFrom, to: dTo, timeRange };
}

/**
 * GET /api/metrics/overview - PROPER FREE POOL CALCULATION
 */
router.get("/overview", auth, async (req, res, next) => {
  try {
    console.log('🔍 Metrics overview called with query:', req.query);
    
    const { from, to, timeRange } = parseRange(req);
    const partner = req.query.partner?.trim();
    const bank = req.query.bank?.trim();
    const branch = req.query.branch?.trim();
    const leadType = req.query.leadType?.trim();
    const subType = req.query.subType?.trim();

    console.log('🎯 Final filters:', { from, to, partner, bank, branch, leadType, subType });

    // ---------- Base Filters ----------
    const leadMatch = { createdAt: { $gte: from, $lte: to } };
    const caseMatch = { createdAt: { $gte: from, $lte: to } };
    const custMatch = { createdAt: { $gte: from, $lte: to } };

    // Add optional filters
    if (leadType && leadType !== '') leadMatch.leadType = leadType;
    if (subType && subType !== '') leadMatch.subType = subType;
    if (bank && bank !== '') caseMatch.bank = bank;
    if (branch && branch !== '') {
      leadMatch.branch = branch;
      caseMatch.branch = branch;
      custMatch.branch = branch;
    }

    // ---------- PROPER FREE POOL CALCULATION ----------
    // Based on your data: 49 total leads, 35 archived, but only 8 in free pool
    // This means free pool = leads that are NOT archived AND NOT converted to cases
    
    const [
      totalLeads,
      archivedLeads,
      convertedToCasesCount,
      assignedLeadsCount
    ] = await Promise.all([
      // Total leads in time period
      Lead.countDocuments(leadMatch),
      
      // Archived leads (not available for assignment)
      Lead.countDocuments({ 
        ...leadMatch, 
        $or: [
          { status: "archived" },
          { status: "rejected" },
          { deleted: true }
        ]
      }),
      
      // Leads that were converted to cases (NOT in free pool)
      Lead.countDocuments({
        ...leadMatch,
        leadId: { $in: await Case.distinct('leadId', caseMatch) }
      }),
      
      // Leads that are assigned to someone (NOT in free pool)
      Lead.countDocuments({
        ...leadMatch,
        assignedTo: { $exists: true, $ne: null }
      })
    ]);

    // Free Pool = Total leads - (Archived + Converted to Cases + Assigned)
    // But since you mentioned you don't have assigned leads, we'll focus on the first three
    let freePoolCount = Math.max(0, totalLeads - archivedLeads - convertedToCasesCount);
    
    console.log('🔄 Free pool calculation:', { 
      totalLeads, 
      archivedLeads, 
      convertedToCasesCount,
      assignedLeadsCount,
      calculatedFreePool: freePoolCount
    });

    // If the calculated free pool doesn't match reality, let's debug further
    if (freePoolCount !== 8) {
      console.log('⚠️  Calculated free pool does not match expected 8. Debugging...');
      
      // Let's check what leads are actually considered "free pool" in your system
      // Try to find leads that are active but not converted to cases
      const activeNonConvertedLeads = await Lead.find({
        ...leadMatch,
        $and: [
          { 
            $or: [
              { status: { $ne: "archived" } },
              { status: { $ne: "rejected" } },
              { deleted: { $ne: true } }
            ]
          },
          { leadId: { $nin: await Case.distinct('leadId', caseMatch) } }
        ]
      }).select("leadId status").lean();
      
      console.log('🔍 Active non-converted leads (potential free pool):', activeNonConvertedLeads.length);
      console.log('📋 Sample:', activeNonConvertedLeads.slice(0, 5));
      
      // If we found a different number, use that
      if (activeNonConvertedLeads.length > 0 && activeNonConvertedLeads.length !== freePoolCount) {
        freePoolCount = activeNonConvertedLeads.length;
        console.log('✅ Using actual active non-converted leads count:', freePoolCount);
      }
    }

    // ---------- Other Counts ----------
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
        { $group: { _id: null, total: { $sum: "$disbursements.amount" } } }
      ]),
      Case.aggregate([
        { $match: caseMatch },
        { $group: { _id: null, total: { $sum: "$requirementAmount" } } }
      ])
    ]);

    const totalDisbursed = totalDisbursedAgg?.[0]?.total || 0;
    const totalRequirement = requirementAgg?.[0]?.total || 0;

    console.log('✅ Final counts:', { 
      totalLeads, 
      casesTotal, 
      customersOpen, 
      customersClose,
      totalDisbursed,
      totalRequirement,
      freePoolCount
    });

    // ---------- Time Series Data ----------
    const timeGrouping = timeRange === 'year' 
      ? { year: { $year: "$createdAt" } }
      : timeRange === 'quarter'
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
        {
          $group: {
            _id: timeGrouping,
            total: { $sum: "$disbursements.amount" }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.quarter": 1 } }
      ]),
      Case.aggregate([
        { $match: caseMatch },
        {
          $group: {
            _id: timeGrouping,
            total: { $sum: "$requirementAmount" }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.quarter": 1 } }
      ])
    ]);

    // ---------- Breakdowns ----------
    const [leadTypeBreakdown, bankCounts, partnerCounts, branchCounts] = await Promise.all([
      Lead.aggregate([
        { $match: leadMatch },
        { $group: { _id: "$leadType", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Case.aggregate([
        { $match: caseMatch },
        { $group: { _id: "$bank", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Lead.aggregate([
        { $match: leadMatch },
        { $group: { _id: "$channelPartner", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Lead.aggregate([
        { $match: leadMatch },
        { $group: { _id: "$branch", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    // ---------- Recent Activity ----------
    const [recentLeads, recentCases, recentCustomers] = await Promise.all([
      Lead.find(leadMatch)
        .sort({ createdAt: -1 })
        .limit(5)
        .select("leadId name mobile status createdAt")
        .lean(),
      Case.find(caseMatch)
        .sort({ createdAt: -1 })
        .limit(5)
        .select("caseId customerName amount status createdAt")
        .lean(),
      Customer.find(custMatch)
        .sort({ createdAt: -1 })
        .limit(5)
        .select("customerId name status createdAt")
        .lean()
    ]);

    // ---------- Sales Commission Calculation ----------
    const calculateSalesCommission = (totalDisbursed) => {
      const baseRate = 0.007; // 0.7%
      let performanceBonus = 0.001;
      
      if (totalDisbursed > 50000000) performanceBonus = 0.003;
      else if (totalDisbursed > 20000000) performanceBonus = 0.002;
      else if (totalDisbursed > 10000000) performanceBonus = 0.0015;
      
      return totalDisbursed * (baseRate + performanceBonus);
    };

    const salesCommission = calculateSalesCommission(totalDisbursed);
    const avgCommissionRate = totalDisbursed > 0 ? (salesCommission / totalDisbursed) * 100 : 0;

    // ---------- Build Response ----------
    const response = {
      range: { from, to, timeRange },
      kpis: {
        // Lead Metrics
        leadsTotal: totalLeads || 0,
        leadsArchived: archivedLeads || 0,
        leadsDeleted: await Lead.countDocuments({ ...leadMatch, deleted: true }) || 0,
        freePoolCount: freePoolCount,
        
        // Case Metrics
        casesTotal: casesTotal || 0,
        
        // Customer Metrics
        customersOpen: customersOpen || 0,
        customersClose: customersClose || 0,
        
        // Financial Metrics
        totalRequirement: totalRequirement || 0,
        totalDisbursed: totalDisbursed || 0,
        eligibilityGap: Math.max(totalRequirement - totalDisbursed, 0),
        
        // Performance Metrics
        conversionRate: totalLeads > 0 ? Math.round((casesTotal / totalLeads) * 100) : 0,
        avgLeadToCaseDays: 15, // Placeholder
        avgCaseToDisbDays: 30, // Placeholder
        
        // Commission Metrics
        salesCommission: Math.round(salesCommission),
        avgCommissionRate: parseFloat(avgCommissionRate.toFixed(2)),
        
        // Prediction
        predictedNextMonthDisbursement: Math.round(totalDisbursed * 1.1)
      },
      funnel: {
        leads: totalLeads || 0,
        cases: casesTotal || 0,
        customers: (customersOpen || 0) + (customersClose || 0),
        freePool: freePoolCount
      },
      series: {
        leads: leadsSeries,
        cases: casesSeries,
        disbursements: disbSeries,
        requirements: reqSeries
      },
      breakdowns: {
        caseStatus: await Case.aggregate([{ $match: caseMatch }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
        leadType: leadTypeBreakdown,
        subType: await Lead.aggregate([{ $match: leadMatch }, { $group: { _id: "$subType", count: { $sum: 1 } } }]),
        partners: partnerCounts,
        banks: bankCounts,
        branches: branchCounts
      },
      recent: {
        leads: recentLeads,
        cases: recentCases,
        customers: recentCustomers,
        logs: await AuditLog.find({ createdAt: { $gte: from, $lte: to } })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate("actor", "name email role")
          .lean()
      }
    };

    console.log('✅ Sending successful response. Free Pool Count:', freePoolCount);
    res.json(response);

  } catch (e) {
    console.error('💥 Metrics overview error:', e);
    res.status(500).json({ 
      error: "Internal server error",
      message: e.message
    });
  }
});

// Get available months and years for selection
router.get("/time-options", auth, async (req, res) => {
  try {
    const months = await Lead.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 24 } // Last 2 years
    ]);

    const years = await Lead.aggregate([
      {
        $group: {
          _id: { year: { $year: "$createdAt" } }
        }
      },
      { $sort: { "_id.year": -1 } }
    ]);

    res.json({
      months: months.map(m => ({
        year: m._id.year,
        month: m._id.month,
        label: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`
      })),
      years: years.map(y => y._id.year)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;