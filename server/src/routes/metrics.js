import express from "express";
import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import Case from "../models/Case.js";
import Customer from "../models/Customer.js";
import AuditLog from "../models/AuditLog.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

function parseRange(req) {
  let { from, to } = req.query;
  const now = new Date();
  const dTo = to ? new Date(to) : now;
  const dFrom = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
  dFrom.setHours(0,0,0,0);
  dTo.setHours(23,59,59,999);
  return { from: dFrom, to: dTo };
}

const monthKey = (d) => `${d._id.year}-${String(d._id.month).padStart(2, "0")}`;

// simple linear regression (x=0..n-1, y=values)
function predictNext(values) {
  if (values.length < 2) return null;
  const n = values.length;
  const xs = [...Array(n)].map((_, i) => i);
  const sumX = xs.reduce((a,b)=>a+b,0);
  const sumY = values.reduce((a,b)=>a+b,0);
  const sumXY = xs.reduce((a,b,i)=>a+b*values[i],0);
  const sumXX = xs.reduce((a,b)=>a+b*b,0);
  const slope = (n*sumXY - sumX*sumY) / (n*sumXX - sumX*sumX || 1);
  const intercept = (sumY - slope*sumX)/n;
  return slope * n + intercept;
}

/**
 * GET /api/metrics/overview
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD&partner=<id-or-name>&bank=<string>&leadType=&subType=
 */
router.get("/overview", auth, async (req, res, next) => {
  try {
    const { from, to } = parseRange(req);
    const partner = req.query.partner?.trim();
    const bank = req.query.bank?.trim();
    const leadType = req.query.leadType?.trim();
    const subType = req.query.subType?.trim();

    // ---------- Base filters ----------
    const leadMatch = { createdAt: { $gte: from, $lte: to } };
    const caseMatch = { createdAt: { $gte: from, $lte: to } };
    const custMatch = { createdAt: { $gte: from, $lte: to } };

    if (leadType) { leadMatch.leadType = leadType; caseMatch.leadType = leadType; }
    if (subType) { leadMatch.subType = subType; caseMatch.subType = subType; }
    if (bank) { caseMatch.bank = bank; }

    // Partner handling
    if (partner) {
      if (mongoose.isValidObjectId(partner)) {
        leadMatch.channelPartner = new mongoose.Types.ObjectId(partner);
        caseMatch.channelPartner = new mongoose.Types.ObjectId(partner);
      } else {
        // Customer kept partner as string name
        custMatch.channelPartner = partner;
      }
    }

    // ---------- Counts & sums ----------
    const [
      leadsTotal,
      leadsArchived,
      leadsDeleted,           // requires you to add {deleted: true} to deleted leads
      casesTotal,
      customersOpen,
      customersClose,
      totalDisbursedAgg,
      requirementAgg
    ] = await Promise.all([
      Lead.countDocuments(leadMatch),
      Lead.countDocuments({ ...leadMatch, status: "archived" }),
      Lead.countDocuments({ ...leadMatch, deleted: true }), // safe even if field not present: returns 0
      Case.countDocuments(caseMatch),
      Customer.countDocuments({ ...custMatch, status: "open" }),
      Customer.countDocuments({ ...custMatch, status: "close" }),
      Customer.aggregate([
        { $match: custMatch },
        { $unwind: { path: "$disbursements", preserveNullAndEmptyArrays: false } },
        { $group: { _id: null, total: { $sum: "$disbursements.amount" } } }
      ]),
      Case.aggregate([
        { $match: caseMatch },
        { $group: { _id: null, total: { $sum: "$requirementAmount" } } }
      ])
    ]);

    const totalDisbursed = totalDisbursedAgg?.[0]?.total || 0;
    const totalRequirement = requirementAgg?.[0]?.total || 0;
    const conversionRate = leadsTotal > 0 ? Math.round((casesTotal / leadsTotal) * 100) : 0;
    const eligibilityGap = Math.max(totalRequirement - totalDisbursed, 0);

    // ---------- Monthly Series ----------
    const monthProjectCreatedAt = { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } };
    const [leadsSeries, casesSeries, disbSeries, reqSeries] = await Promise.all([
      Lead.aggregate([
        { $match: leadMatch },
        { $project: monthProjectCreatedAt },
        { $group: { _id: { year: "$year", month: "$month" }, count: { $sum: 1 } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]),
      Case.aggregate([
        { $match: caseMatch },
        { $project: monthProjectCreatedAt },
        { $group: { _id: { year: "$year", month: "$month" }, count: { $sum: 1 } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]),
      Customer.aggregate([
        { $match: custMatch },
        { $unwind: { path: "$disbursements", preserveNullAndEmptyArrays: false } },
        { $match: { "disbursements.date": { $gte: from, $lte: to } } },
        {
          $project: {
            amount: "$disbursements.amount",
            at: "$disbursements.date",
            year: { $year: "$disbursements.date" },
            month: { $month: "$disbursements.date" }
          }
        },
        { $group: { _id: { year: "$year", month: "$month" }, total: { $sum: "$amount" } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]),
      Case.aggregate([
        { $match: caseMatch },
        {
          $project: {
            requirementAmount: 1,
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          }
        },
        { $group: { _id: { year: "$year", month: "$month" }, total: { $sum: "$requirementAmount" } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]),
    ]);

    // ---------- Aging ----------
    // lead→case by leadId join proxy (string match on case.caseId === lead.leadId)
    const leadCasePairs = await Case.aggregate([
      { $match: caseMatch },
      {
        $lookup: {
          from: "leads",
          localField: "caseId",
          foreignField: "leadId",
          as: "lead"
        }
      },
      { $unwind: "$lead" },
      {
        $project: {
          leadCreated: "$lead.createdAt",
          caseCreated: "$createdAt"
        }
      }
    ]);

    const msLeadToCase = leadCasePairs.map(p => new Date(p.caseCreated) - new Date(p.leadCreated)).filter(n => n >= 0);
    const avgLeadToCaseDays = msLeadToCase.length ? Math.round(msLeadToCase.reduce((a,b)=>a+b,0) / msLeadToCase.length / (1000*60*60*24)) : 0;

    // case→firstDisbursement (from customers by customerId = leadId)
    const caseFirstDisb = await Customer.aggregate([
      { $match: custMatch },
      { $unwind: { path: "$disbursements", preserveNullAndEmptyArrays: false } },
      { $sort: { "disbursements.date": 1 } },
      {
        $group: {
          _id: "$customerId",
          firstDisb: { $first: "$disbursements.date" }
        }
      },
      {
        $lookup: {
          from: "cases",
          localField: "_id",
          foreignField: "caseId",
          as: "case"
        }
      },
      { $unwind: "$case" },
      {
        $project: {
          caseCreated: "$case.createdAt",
          firstDisb: 1
        }
      }
    ]);

    const msCaseToDisb = caseFirstDisb.map(p => new Date(p.firstDisb) - new Date(p.caseCreated)).filter(n => n >= 0);
    const avgCaseToDisbDays = msCaseToDisb.length ? Math.round(msCaseToDisb.reduce((a,b)=>a+b,0) / msCaseToDisb.length / (1000*60*60*24)) : 0;

    // ---------- Breakdown / distributions ----------
    const [caseStatusBreakdown, leadTypeBreakdown, subTypeBreakdown, partnerCounts, bankCounts] = await Promise.all([
      Case.aggregate([{ $match: caseMatch }, { $group: { _id: "$status", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Lead.aggregate([{ $match: leadMatch }, { $group: { _id: "$leadType", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Lead.aggregate([{ $match: leadMatch }, { $group: { _id: "$subType", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Lead.aggregate([{ $match: leadMatch }, { $group: { _id: "$channelPartner", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Case.aggregate([{ $match: caseMatch }, { $group: { _id: "$bank", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    ]);

    // ---------- Recent activity & logs ----------
    const [recentLeads, recentCases, recentCustomers, recentLogs] = await Promise.all([
      Lead.find(leadMatch).sort({ createdAt: -1 }).limit(5).select("leadId name mobile status createdAt"),
      Case.find(caseMatch).sort({ createdAt: -1 }).limit(5).select("caseId customerName amount status createdAt"),
      Customer.find(custMatch).sort({ createdAt: -1 }).limit(5).select("customerId name status createdAt"),
      AuditLog.find().sort({ createdAt: -1 }).limit(10).populate("actor", "name email role")
    ]);

    // ---------- Predict next month disbursement ----------
    const disbSeriesOrdered = disbSeries.map(r => ({ key: monthKey(r), total: r.total })).sort((a,b)=>a.key.localeCompare(b.key));
    const predictedNext = predictNext(disbSeriesOrdered.map(d => d.total)) || 0;

    res.json({
      range: { from, to },
      kpis: {
        leadsTotal,
        leadsArchived,
        leadsDeleted,
        casesTotal,
        customersOpen,
        customersClose,
        totalRequirement,
        totalDisbursed,
        eligibilityGap,
        conversionRate,
        avgLeadToCaseDays,
        avgCaseToDisbDays,
        predictedNextMonthDisbursement: Math.max(0, Math.round(predictedNext))
      },
      funnel: {
        leads: leadsTotal,
        cases: casesTotal,
        customers: customersOpen + customersClose
      },
      series: {
        leads: leadsSeries,
        cases: casesSeries,
        disbursements: disbSeries,
        requirements: reqSeries
      },
      breakdowns: {
        caseStatus: caseStatusBreakdown,
        leadType: leadTypeBreakdown,
        subType: subTypeBreakdown,
        partners: partnerCounts,
        banks: bankCounts
      },
      recent: {
        leads: recentLeads,
        cases: recentCases,
        customers: recentCustomers,
        logs: recentLogs
      }
    });
  } catch (e) {
    next(e);
  }
});

export default router;
