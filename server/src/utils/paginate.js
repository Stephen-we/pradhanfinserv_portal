export async function listWithPagination(Model, query={}, {page=1, limit=10, sort={createdAt:-1}}={}){
  page = Math.max(1, parseInt(page,10)||1);
  limit = Math.min(100, Math.max(1, parseInt(limit,10)||10));
  const [items, total] = await Promise.all([
    Model.find(query).sort(sort).skip((page-1)*limit).limit(limit),
    Model.countDocuments(query)
  ]);
  return { items, total, page, pages: Math.ceil(total/limit) };
}
