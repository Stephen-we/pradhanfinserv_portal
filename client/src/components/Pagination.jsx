// client/src/componenets/Pagination.jsx
import React from "react";
import "../styles/pagination.css";

export default function Pagination({ page, pages, onPage }) {
  if (!pages || pages <= 1) return null;

  const handlePageClick = (p) => {
    if (p >= 1 && p <= pages && p !== page) onPage(p);
  };

  const pageNumbers = [];
  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(pages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible && start > 1)
    start = Math.max(1, end - maxVisible + 1);

  for (let i = start; i <= end; i++) {
    pageNumbers.push(
      <button
        key={i}
        onClick={() => handlePageClick(i)}
        className={`btn-page ${i === page ? "active" : ""}`}
      >
        {i}
      </button>
    );
  }

  return (
    <div className="pagination">
      <button
        className="btn-page"
        disabled={page === 1}
        onClick={() => handlePageClick(page - 1)}
      >
        Prev
      </button>

      {start > 1 && (
        <>
          <button className="btn-page" onClick={() => handlePageClick(1)}>
            1
          </button>
          {start > 2 && <span className="ellipsis">...</span>}
        </>
      )}

      {pageNumbers}

      {end < pages && (
        <>
          {end < pages - 1 && <span className="ellipsis">...</span>}
          <button className="btn-page" onClick={() => handlePageClick(pages)}>
            {pages}
          </button>
        </>
      )}

      <button
        className="btn-page"
        disabled={page === pages}
        onClick={() => handlePageClick(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
