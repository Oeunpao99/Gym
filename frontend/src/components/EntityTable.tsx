import type { EntitySchema } from '../config/entitySchemas'

interface EntityTableProps {
  schema: EntitySchema
  rows: Record<string, unknown>[]
  onEdit: (row: Record<string, unknown>) => void
  onDelete: (row: Record<string, unknown>) => void
  extraActions?: (row: Record<string, unknown>) => React.ReactNode
}

export function EntityTable({ schema, rows, onEdit, onDelete, extraActions }: EntityTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {schema.columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row.id)}>
              {schema.columns.map((col) => (
                <td key={col.key}>
                  {col.type === 'checkbox' ? (row[col.key] ? 'Yes' : 'No') : String(row[col.key] ?? '')}
                </td>
              ))}
              <td className="actions-cell">
                <button onClick={() => onEdit(row)}>Edit</button>
                <button onClick={() => onDelete(row)} className="danger">
                  Delete
                </button>
                {extraActions?.(row)}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={schema.columns.length + 1} className="empty-row">
                No records yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
