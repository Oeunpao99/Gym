import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { entitySchemas } from '../../config/entitySchemas'
import { createEntity, deleteEntity, listEntities, updateEntity } from '../../api/entities'
import { EntityTable } from '../../components/EntityTable'
import { EntityModal } from '../../components/EntityModal'

export function GenericEntityPage({ entityKey: entityKeyProp }: { entityKey?: string } = {}) {
  const { entityKey: entityKeyParam } = useParams<{ entityKey: string }>()
  const entityKey = entityKeyProp ?? entityKeyParam
  const schema = entityKey ? entitySchemas[entityKey] : undefined

  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)
  const [showModal, setShowModal] = useState(false)

  async function refresh() {
    if (!schema) return
    setLoading(true)
    const data = await listEntities<Record<string, unknown>>(schema.apiPath)
    setRows(data)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityKey])

  if (!schema) return <p>Unknown entity: {entityKey}</p>

  function openAdd() {
    setEditing({})
    setShowModal(true)
  }

  function openEdit(row: Record<string, unknown>) {
    setEditing(row)
    setShowModal(true)
  }

  async function handleSave(values: Record<string, unknown>) {
    // schema is guaranteed defined here - this closure is only ever invoked from
    // elements rendered after the `if (!schema) return` guard above.
    const apiPath = schema!.apiPath
    if (editing?.id) {
      await updateEntity(apiPath, Number(editing.id), values)
    } else {
      await createEntity(apiPath, values)
    }
    await refresh()
  }

  async function handleDelete(row: Record<string, unknown>) {
    if (!confirm(`Delete this ${schema!.title.toLowerCase()} entry?`)) return
    await deleteEntity(schema!.apiPath, Number(row.id))
    await refresh()
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>{schema.title}</h2>
        <button className="primary" onClick={openAdd}>
          Add {schema.title}
        </button>
      </div>
      {loading ? (
        <div className="loading-state">
          <span className="spinner" />
          Loading...
        </div>
      ) : (
        <EntityTable schema={schema} rows={rows} onEdit={openEdit} onDelete={handleDelete} />
      )}
      {showModal && editing && (
        <EntityModal schema={schema} initial={editing} onSave={handleSave} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
