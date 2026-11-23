import { apiRequest } from './client'

export interface DatasetColumn {
  name: string
  kind: 'numeric' | 'text'
  non_missing_count: number
  missing_count: number
}

export interface DatasetMetadata {
  dataset_id: string
  filename: string
  sha256: string
  byte_count: number
  row_count: number
  columns: DatasetColumn[]
  created_at: string
  format: 'csv'
}

export interface DatasetPreview {
  dataset_id: string
  row_count: number
  columns: string[]
  rows: Array<Array<string | null>>
}

export interface DatasetPage {
  items: DatasetMetadata[]
  next_cursor: string | null
}

const DATASETS_PATH = '/v1/datasets'

export async function uploadDataset(file: File): Promise<DatasetMetadata> {
  const filename = encodeURIComponent(file.name)

  return apiRequest<DatasetMetadata>(
    `${DATASETS_PATH}?filename=${filename}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'text/csv',
      },
      body: file,
    },
  )
}

export async function listDatasets(
  limit = 50,
  after?: string,
): Promise<DatasetPage> {
  const params = new URLSearchParams({ limit: String(limit) })

  if (after) {
    params.set('after', after)
  }

  return apiRequest<DatasetPage>(`${DATASETS_PATH}?${params.toString()}`)
}

export async function getDataset(
  datasetId: string,
): Promise<DatasetMetadata> {
  return apiRequest<DatasetMetadata>(
    `${DATASETS_PATH}/${encodeURIComponent(datasetId)}`,
  )
}

export async function previewDataset(
  datasetId: string,
): Promise<DatasetPreview> {
  return apiRequest<DatasetPreview>(
    `${DATASETS_PATH}/${encodeURIComponent(datasetId)}/preview`,
  )
}

export async function deleteDataset(datasetId: string): Promise<void> {
  return apiRequest<void>(
    `${DATASETS_PATH}/${encodeURIComponent(datasetId)}`,
    { method: 'DELETE' },
  )
}

export async function listConversationAttachments(
  conversationId: string,
): Promise<DatasetMetadata[]> {
  return apiRequest<DatasetMetadata[]>(
    `/v1/conversations/${encodeURIComponent(conversationId)}/attachments`,
  )
}

export async function replaceConversationAttachments(
  conversationId: string,
  datasetIds: string[],
): Promise<DatasetMetadata[]> {
  return apiRequest<DatasetMetadata[]>(
    `/v1/conversations/${encodeURIComponent(conversationId)}/attachments`,
    {
      method: 'PUT',
      body: JSON.stringify({ dataset_ids: datasetIds }),
    },
  )
}
