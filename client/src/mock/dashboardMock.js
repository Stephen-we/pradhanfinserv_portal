export const mockData = {
  kpis: {
    totalLeads: 512,
    freePool: 134,
    archived: 58,
    disbursedAmount: 2450000,
  },
  cases: [
    { loanType: "Home Loan", disbursedAmount: 550000, assignedTo: { name: "Ravi" }, createdAt: "2025-09-01", updatedAt: "2025-09-03" },
    { loanType: "Business Loan", disbursedAmount: 900000, assignedTo: { name: "Amit" }, createdAt: "2025-09-02", updatedAt: "2025-09-05" },
    { loanType: "Education Loan", disbursedAmount: 300000, assignedTo: { name: "Priya" }, createdAt: "2025-09-04", updatedAt: "2025-09-08" },
    { loanType: "Vehicle Loan", disbursedAmount: 700000, assignedTo: { name: "Amit" }, createdAt: "2025-09-03", updatedAt: "2025-09-06" },
    { loanType: "LAP", disbursedAmount: 0, assignedTo: { name: "Unassigned" }, createdAt: "2025-09-05", updatedAt: "2025-09-05" },
  ],
};
