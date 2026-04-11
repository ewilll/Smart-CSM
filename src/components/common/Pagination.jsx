import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * A reusable pagination component for lists and tables.
 * @param {number} currentPage - The current zero-indexed page.
 * @param {number} totalItems - Total number of items across all pages.
 * @param {number} pageSize - Number of items per page.
 * @param {function} onPageChange - Callback when a page is clicked.
 */
const Pagination = ({ currentPage, totalItems, pageSize, onPageChange }) => {
    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) return null;

    const renderPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(0, currentPage - 2);
        let end = Math.min(totalPages - 1, start + maxVisible - 1);

        if (end - start < maxVisible - 1) {
            start = Math.max(0, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => onPageChange(i)}
                    className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${currentPage === i
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-600/10'
                            : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'
                        }`}
                >
                    {i + 1}
                </button>
            );
        }
        return pages;
    };

    return (
        <div className="flex items-center justify-between mt-8 px-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Showing <span className="text-slate-600">{currentPage * pageSize + 1}</span> to <span className="text-slate-600">{Math.min((currentPage + 1) * pageSize, totalItems)}</span> of <span className="text-slate-600">{totalItems}</span>
            </p>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 0}
                    className={`p-2.5 rounded-xl border border-slate-100 transition-all ${currentPage === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:bg-slate-50'
                        }`}
                >
                    <ChevronLeft size={18} />
                </button>

                <div className="flex items-center gap-1.5 mx-2">
                    {renderPageNumbers()}
                </div>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages - 1}
                    className={`p-2.5 rounded-xl border border-slate-100 transition-all ${currentPage >= totalPages - 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:bg-slate-50'
                        }`}
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
