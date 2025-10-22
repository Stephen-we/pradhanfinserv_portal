 // ✅ server/src/utils/paginate_customers.js
export async function listWithPagination(
  Model,
  query = {},
  { page = 1, limit = 10, sort = { createdAt: -1 }, populate = [] } = {}
) {
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

  // ✅ If status filter applied — do normal pagination
  if (query.status && ["open", "close"].includes(query.status)) {
    const total = await Model.countDocuments(query);
    const items = await Model.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(populate);

    return {
      items,
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    };
  }

  // ✅ Separate open and close data sets
  const openQuery = { ...query, status: "open" };
  const closeQuery = { ...query, status: "close" };

  const [openCount, closeCount] = await Promise.all([
    Model.countDocuments(openQuery),
    Model.countDocuments(closeQuery),
  ]);

  const total = openCount + closeCount;
  const totalPages = Math.ceil(total / limit);
  const openPages = Math.ceil(openCount / limit);
  let items = [];

  // ✅ Page within open range
  if (page <= openPages) {
    const skip = (page - 1) * limit;
    items = await Model.find(openQuery)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate(populate);
  } 
  // ✅ Page beyond open range (show closes here)
  else {
    const closePage = page - openPages; // new index for close pages
    const skip = (closePage - 1) * limit;
    items = await Model.find(closeQuery)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate(populate);
  }

  return {
    items,
    total,
    page,
    pages: totalPages,
    limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
