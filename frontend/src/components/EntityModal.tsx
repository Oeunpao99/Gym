import { useState } from 'react'
import type { EntitySchema } from '../config/entitySchemas'

interface EntityModalProps {
  schema: EntitySchema
  initial: Record<string, unknown>
  onSave: (values: Record<string, unknown>) => Promise<void>
  onClose: () => void
}

export function EntityModal({ schema, initial, onSave, onClose }: EntityModalProps) {
  const [values, setValues] = useState<Record<string, unknown>>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setField(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSave(values)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{schema.title}</h3>
        <form onSubmit={handleSubmit}>
          {schema.formFields.map((field) => (
            <label key={field.key} className="form-field">
              <span>{field.label}</span>
              {field.type === 'select' ? (
                <select
                  value={(values[field.key] as string) ?? ''}
                  disabled={field.readOnly}
                  onChange={(e) => setField(field.key, e.target.value)}
                >
                  <option value="" disabled>
                    Select...
                  </option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : field.type === 'checkbox' ? (
                <input
                  type="checkbox"
                  checked={Boolean(values[field.key])}
                  disabled={field.readOnly}
                  onChange={(e) => setField(field.key, e.target.checked)}
                />
              ) : field.type === 'textarea' ? (
                <textarea
                  value={(values[field.key] as string) ?? ''}
                  disabled={field.readOnly}
                  onChange={(e) => setField(field.key, e.target.value)}
                />
              ) : (
                <input
                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                  value={(values[field.key] as string | number) ?? ''}
                  disabled={field.readOnly}
                  onChange={(e) =>
                    setField(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)
                  }
                />
              )}
            </label>
          ))}
          {error && <p className="error-text">{error}</p>}
          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
