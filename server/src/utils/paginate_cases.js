// ✅ server/src/utils/paginate_cases.js
export async function listWithPagination(
  Model,
  query = {},
  { page = 1, limit = 10, sort = { createdAt: -1 }, populate = [] } = {}
) {
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

  // ✅ If explicit task filter (e.g. task=Complete) then paginate normally
  if (query.task && ["Complete"].includes(query.task)) {
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

  // ✅ Separate open vs complete tasks
  const openQuery = { ...query, task: { $ne: "Complete" } };
  const completeQuery = { ...query, task: "Complete" };

  const [openCount, completeCount] = await Promise.all([
    Model.countDocuments(openQuery),
    Model.countDocuments(completeQuery),
  ]);

  const total = openCount + completeCount;
  const totalPages = Math.ceil(total / limit);
  const openPages = Math.ceil(openCount / limit);

  let items = [];

  // ✅ If page within open range
  if (page <= openPages) {
    const skip = (page - 1) * limit;
    items = await Model.find(openQuery)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate(populate);
  } else {
    // ✅ Page in complete range
    const completePage = page - openPages;
    const skip = (completePage - 1) * limit;
    items = await Model.find(completeQuery)
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
