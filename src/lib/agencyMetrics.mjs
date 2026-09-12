export const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const campaignMetrics = (campaign) => {
  const spend = Math.max(0, safeNumber(campaign.spend));
  const impressions = Math.max(0, safeNumber(campaign.impressions));
  const clicks = Math.max(0, safeNumber(campaign.clicks));
  const results = Math.max(0, safeNumber(campaign.results));
  const sales = Math.max(0, safeNumber(campaign.sales_value));
  return { ctr: impressions ? (clicks / impressions) * 100 : 0, resultCost: results ? spend / results : 0, roas: spend ? sales / spend : 0 };
};

export const profitability = ({ revenue, expenses, labor }) => {
  const safeRevenue = Math.max(0, safeNumber(revenue));
  const cost = Math.max(0, safeNumber(expenses)) + Math.max(0, safeNumber(labor));
  const profit = safeRevenue - cost;
  return { cost, profit, margin: safeRevenue ? (profit / safeRevenue) * 100 : 0 };
};
