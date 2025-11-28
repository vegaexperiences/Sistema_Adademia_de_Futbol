'use client';

import { ReactNode } from 'react';

interface ResponsiveTableProps {
  headers: string[];
  rows: ReactNode[][];
  mobileCard?: (row: ReactNode[], index: number) => ReactNode;
  className?: string;
}

export function ResponsiveTable({ headers, rows, mobileCard, className = '' }: ResponsiveTableProps) {
  return (
    <>
      {/* Mobile View - Cards */}
      <div className="block md:hidden space-y-3">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="glass-card p-4 space-y-2">
            {mobileCard ? (
              mobileCard(row, rowIndex)
            ) : (
              <>
                {headers.map((header, colIndex) => (
                  <div key={colIndex} className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      {header}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white text-right flex-1 ml-4">
                      {row[colIndex]}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Desktop View - Table */}
      <div className={`hidden md:block overflow-x-auto ${className}`}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                {row.map((cell, colIndex) => (
                  <td
                    key={colIndex}
                    className="px-4 py-3 text-sm text-gray-900 dark:text-white"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

