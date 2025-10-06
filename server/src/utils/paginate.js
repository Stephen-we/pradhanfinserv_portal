// server/src/utils/paginate.js
export async function listWithPagination(
  Model,
  query = {},
  { page = 1, limit = 10, sort = { createdAt: -1 }, populate = [] } = {}
) {
  // ✅ Normalize values
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

  // ✅ Count total first
  const total = await Model.countDocuments(query);

  // ✅ Build query with pagination
  let mongoQuery = Model.find(query)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);

  // ✅ Apply population dynamically (support array or single)
  if (populate) {
    if (Array.isArray(populate)) {
      populate.forEach((p) => (mongoQuery = mongoQuery.populate(p)));
    } else {
      mongoQuery = mongoQuery.populate(populate);
    }
  }

  const items = await mongoQuery.exec();

  // ✅ Return consistent pagination structure
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
