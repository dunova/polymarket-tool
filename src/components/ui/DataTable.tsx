'use client';

import { ReactNode } from 'react';

interface Column<T> {
    key: string;
    header: string;
    width?: string;
    align?: 'left' | 'center' | 'right';
    render?: (item: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    keyExtractor: (item: T, index: number) => string | number;
    loading?: boolean;
    emptyMessage?: string;
    onRowClick?: (item: T) => void;
    className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
    columns,
    data,
    keyExtractor,
    loading = false,
    emptyMessage = 'No data available',
    onRowClick,
    className = '',
}: DataTableProps<T>) {
    if (loading) {
        return (
            <div className={`panel ${className}`}>
                <table className="data-table">
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th key={col.key} style={{ width: col.width }}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(5)].map((_, i) => (
                            <tr key={i}>
                                {columns.map((col) => (
                                    <td key={col.key}>
                                        <div className="skeleton h-4 w-full" />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className={`panel p-8 text-center ${className}`}>
                <p className="text-[var(--text-muted)] text-sm">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className={`panel overflow-hidden ${className}`}>
            <div className="overflow-x-auto">
                <table className="data-table">
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    style={{ width: col.width, textAlign: col.align || 'left' }}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item, index) => (
                            <tr
                                key={keyExtractor(item, index)}
                                onClick={() => onRowClick?.(item)}
                                className={onRowClick ? 'cursor-pointer' : ''}
                            >
                                {columns.map((col) => (
                                    <td
                                        key={col.key}
                                        style={{ textAlign: col.align || 'left' }}
                                    >
                                        {col.render
                                            ? col.render(item, index)
                                            : String(item[col.key] ?? '')
                                        }
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
