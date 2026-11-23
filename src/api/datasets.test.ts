import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from './client'
import {
  deleteDataset,
  getDataset,
  listConversationAttachments,
  listDatasets,
  previewDataset,
  replaceConversationAttachments,
  uploadDataset,
  type DatasetMetadata,
} from './datasets'

vi.mock('./client', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

const dataset: DatasetMetadata = {
  dataset_id: '123e4567-e89b-12d3-a456-426614174000',
  filename: 'sales.csv',
  sha256: 'a'.repeat(64),
  byte_count: 1024,
  row_count: 10,
  columns: [
    {
      name: 'revenue',
      kind: 'numeric',
      non_missing_count: 10,
      missing_count: 0,
    },
  ],
  created_at: '2026-11-23T00:00:00Z',
  format: 'csv',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedApiRequest.mockResolvedValue(dataset)
})

describe('dataset API', () => {
  it('uploads the raw CSV file with the correct content type', async () => {
    const file = new File(['revenue\n100'], 'sales.csv', {
      type: 'text/csv',
    })

    await uploadDataset(file)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      '/v1/datasets?filename=sales.csv',
      {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: file,
      },
    )
  })

  it('encodes filenames in the upload URL', async () => {
    const file = new File(['a,b'], 'monthly sales #1.csv')

    await uploadDataset(file)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      '/v1/datasets?filename=monthly%20sales%20%231.csv',
      expect.any(Object),
    )
  })

  it('lists datasets with the default page size', async () => {
    await listDatasets()

    expect(mockedApiRequest).toHaveBeenCalledWith(
      '/v1/datasets?limit=50',
    )
  })

  it('supports dataset pagination', async () => {
    await listDatasets(25, 'next-cursor')

    expect(mockedApiRequest).toHaveBeenCalledWith(
      '/v1/datasets?limit=25&after=next-cursor',
    )
  })

  it('gets dataset metadata', async () => {
    await getDataset(dataset.dataset_id)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `/v1/datasets/${dataset.dataset_id}`,
    )
  })

  it('gets a dataset preview', async () => {
    await previewDataset(dataset.dataset_id)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `/v1/datasets/${dataset.dataset_id}/preview`,
    )
  })

  it('deletes a dataset using DELETE', async () => {
    mockedApiRequest.mockResolvedValueOnce(undefined)

    await deleteDataset(dataset.dataset_id)

    expect(mockedApiRequest).toHaveBeenCalledWith(
      `/v1/datasets/${dataset.dataset_id}`,
      { method: 'DELETE' },
    )
  })

  it('lists conversation attachments', async () => {
    await listConversationAttachments('conversation-123')

    expect(mockedApiRequest).toHaveBeenCalledWith(
      '/v1/conversations/conversation-123/attachments',
    )
  })

  it('replaces conversation attachments with dataset IDs', async () => {
    await replaceConversationAttachments(
      'conversation-123',
      [dataset.dataset_id],
    )

    expect(mockedApiRequest).toHaveBeenCalledWith(
      '/v1/conversations/conversation-123/attachments',
      {
        method: 'PUT',
        body: JSON.stringify({
          dataset_ids: [dataset.dataset_id],
        }),
      },
    )
  })
})
