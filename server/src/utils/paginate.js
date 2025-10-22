export async function listWithPagination(
  Model,
  query = {},
  { page = 1, limit = 10, sort = { createdAt: -1 }, populate = [] } = {}
) {
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

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
