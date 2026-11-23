import { useEffect, useState } from 'react'
import {
  deleteDataset,
  listDatasets,
  previewDataset,
  uploadDataset,
  type DatasetMetadata,
  type DatasetPreview,
} from '../api/datasets'
import './DatasetWorkspace.css'

const PAGE_SIZE = 50
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function DatasetWorkspace() {
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<DatasetPreview | null>(null)
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadDatasets() {
    setIsLoading(true)
    setError('')

    try {
      const page = await listDatasets(PAGE_SIZE)
      setDatasets(page.items)
      setNextCursor(page.next_cursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load datasets.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadDatasets()
  }, [])

  async function handleUpload(file: File) {
    setError('')
    setNotice('')
    setPreview(null)

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please choose a CSV file.')
      return
    }

    if (file.size === 0) {
      setError('The selected file is empty.')
      return
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setError('The file exceeds the 5 MiB upload limit.')
      return
    }

    setIsUploading(true)

    try {
      const uploaded = await uploadDataset(file)
      setDatasets((current) => [
        uploaded,
        ...current.filter((item) => item.dataset_id !== uploaded.dataset_id),
      ])
      setNotice(`${uploaded.filename} was uploaded successfully.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  async function loadMore() {
    if (!nextCursor || isLoadingMore) return

    setIsLoadingMore(true)
    setError('')

    try {
      const page = await listDatasets(PAGE_SIZE, nextCursor)
      setDatasets((current) => [...current, ...page.items])
      setNextCursor(page.next_cursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load more datasets.')
    } finally {
      setIsLoadingMore(false)
    }
  }

  async function togglePreview(datasetId: string) {
    if (preview?.dataset_id === datasetId) {
      setPreview(null)
      return
    }

    setPreviewLoadingId(datasetId)
    setError('')

    try {
      const result = await previewDataset(datasetId)
      setPreview(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load dataset preview.')
    } finally {
      setPreviewLoadingId(null)
    }
  }

  async function handleDelete(dataset: DatasetMetadata) {
    const confirmed = window.confirm(
      `Delete "${dataset.filename}"? This action cannot be undone.`,
    )

    if (!confirmed) return

    setDeletingId(dataset.dataset_id)
    setError('')
    setNotice('')

    try {
      await deleteDataset(dataset.dataset_id)
      setDatasets((current) =>
        current.filter((item) => item.dataset_id !== dataset.dataset_id),
      )

      if (preview?.dataset_id === dataset.dataset_id) {
        setPreview(null)
      }

      setNotice(`${dataset.filename} was deleted.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete dataset.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="dataset-workspace">
      <div className="dataset-heading">
        <div>
          <p className="eyebrow">YOUR DATA WORKSPACE</p>
          <h1>Datasets</h1>
          <p className="dataset-subtitle">
            Upload, explore, and manage the CSV files available in your workspace.
          </p>
        </div>
        <label className={`upload-button ${isUploading ? 'is-disabled' : ''}`}>
          {isUploading ? 'Uploading...' : '+ Upload CSV'}
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={isUploading}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleUpload(file)
              event.target.value = ''
            }}
          />
        </label>
      </div>

      <div className="upload-hint">
        CSV files only · Maximum file size: 5 MiB
      </div>

      {error && <p className="dataset-message error" role="alert">{error}</p>}
      {notice && <p className="dataset-message success" role="status">{notice}</p>}

      <div className="dataset-list-card">
        <div className="dataset-list-heading">
          <div>
            <h2>Your datasets</h2>
            <p>Files uploaded to your account</p>
          </div>
          <span className="dataset-count">{datasets.length} shown</span>
        </div>

        {isLoading ? (
          <div className="dataset-empty-state">Loading datasets...</div>
        ) : datasets.length === 0 ? (
          <div className="dataset-empty-state">
            <div className="dataset-empty-icon">▤</div>
            <strong>No datasets yet</strong>
            <p>Upload a CSV file to see it here.</p>
          </div>
        ) : (
          <div className="dataset-table-wrap">
            <table className="dataset-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Rows</th>
                  <th>Columns</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((dataset) => (
                  <tr key={dataset.dataset_id}>
                    <td>
                      <div className="dataset-file">
                        <span className="csv-icon">CSV</span>
                        <strong>{dataset.filename}</strong>
                      </div>
                    </td>
                    <td>{dataset.row_count.toLocaleString()}</td>
                    <td>{dataset.columns.length}</td>
                    <td>{formatBytes(dataset.byte_count)}</td>
                    <td>{new Date(dataset.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="dataset-actions">
                        <button
                          className="text-action"
                          onClick={() => void togglePreview(dataset.dataset_id)}
                          disabled={previewLoadingId === dataset.dataset_id}
                        >
                          {previewLoadingId === dataset.dataset_id
                            ? 'Loading...'
                            : preview?.dataset_id === dataset.dataset_id
                              ? 'Close'
                              : 'Preview'}
                        </button>
                        <button
                          className="text-action delete-action"
                          onClick={() => void handleDelete(dataset)}
                          disabled={deletingId === dataset.dataset_id}
                        >
                          {deletingId === dataset.dataset_id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && nextCursor && (
          <div className="load-more-row">
            <button
              className="secondary-button"
              onClick={() => void loadMore()}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? 'Loading...' : 'Load more datasets'}
            </button>
          </div>
        )}
      </div>

      {preview && (
        <div className="dataset-preview-card">
          <div className="dataset-list-heading">
            <div>
              <h2>Data preview</h2>
              <p>
                First {preview.rows.length} rows of {preview.row_count.toLocaleString()}
                {' '}total rows
              </p>
            </div>
            <button className="text-action" onClick={() => setPreview(null)}>
              Close preview
            </button>
          </div>

          <div className="dataset-table-wrap">
            <table className="dataset-table preview-table">
              <thead>
                <tr>
                  {preview.columns.map((column, index) => (
                    <th key={`${column}-${index}`}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((value, cellIndex) => (
                      <td key={cellIndex}>{value ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}

export default DatasetWorkspace
