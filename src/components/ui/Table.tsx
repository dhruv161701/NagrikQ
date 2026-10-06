import React from 'react';
import { useUI } from '../../context/UIContext';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
}

export function Table<T>({ columns, data, keyExtractor, emptyMessage = 'No records found.' }: TableProps<T>) {
  const { uiMode } = useUI();
  const isSimple = uiMode === 'simple';

  return (
    <div style={{ width: '100%', overflowX: 'auto', borderRadius: isSimple ? '14px' : '12px', border: '1px solid var(--color-neutral-200)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: 'var(--color-white)' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--color-neutral-100)', borderBottom: '1px solid var(--color-neutral-200)' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: isSimple ? '16px 20px' : '12px 16px',
                  fontSize: isSimple ? '1rem' : '0.85rem',
                  fontWeight: 700,
                  color: 'var(--color-neutral-700)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  width: col.width,
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-neutral-500)' }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                style={{
                  borderBottom: '1px solid var(--color-neutral-200)',
                  height: isSimple ? '68px' : '56px',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: isSimple ? '16px 20px' : '12px 16px',
                      fontSize: isSimple ? '1.05rem' : '0.95rem',
                      color: 'var(--color-neutral-900)',
                    }}
                  >
                    {col.render ? col.render(row) : (row as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
