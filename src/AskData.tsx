import { useEffect, useState } from 'react'
import { listDatasets, type DatasetMetadata } from './api/datasets'
import { apiRequest } from './api/client'
import { ApiRunService } from './runs/apiService'
import type { RunSubmission } from './runs/types'

interface AskDataProps {
  onSubmitted: () => void
}

interface CreatedConversation {
  conversation_id: string
  title: string
  created_at: string
}

function AskData({ onSubmitted }: AskDataProps) {
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([])
  const [selectedDataset, setSelectedDataset] = useState('')
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const page = await listDatasets(50)

        if (active) {
          setDatasets(page.items)
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Could not load datasets.',
          )
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  async function handleSubmit() {
    const cleanQuestion = question.trim()

    if (!selectedDataset) {
      setError('Please select a dataset first.')
      return
    }

    if (!cleanQuestion) {
      setError('Please enter your question.')
      return
    }

    if (cleanQuestion.length > 8192) {
      setError('Your question is too long. Maximum length is 8192 characters.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      const title =
        cleanQuestion.length > 120
          ? `${cleanQuestion.slice(0, 117)}...`
          : cleanQuestion

      const conversation = await apiRequest<CreatedConversation>(
        '/v1/conversations',
        {
          method: 'POST',
          body: JSON.stringify({ title }),
        },
      )
            await apiRequest(
        `/v1/conversations/${conversation.conversation_id}/attachments`,
        {
          method: 'PUT',
          body: JSON.stringify({
            dataset_ids: [selectedDataset],
          }),
        },
      )

      const submission: RunSubmission = {
        idempotency_key: crypto.randomUUID(),
        conversation_id: conversation.conversation_id,
        question: cleanQuestion,
        dataset_ids: [selectedDataset],
        prior_tool_call_ids: [],
      }

      await new ApiRunService().submitRun(submission)

      onSubmitted()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not submit your analysis. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="question-card">
      <div className="card-heading">
        <div>
          <h2>Ask your data</h2>
          <p>Select a dataset and enter a question to start your analysis.</p>
        </div>
        <span className="ai-label">✧ AI ASSISTANT</span>
      </div>

      <label htmlFor="dataset">SELECT DATASET</label>

      <select
        id="dataset"
        value={selectedDataset}
        onChange={(event) => setSelectedDataset(event.target.value)}
        disabled={isLoading || isSubmitting}
      >
        <option value="">
          {isLoading ? 'Loading datasets...' : 'Choose a dataset...'}
        </option>

        {datasets.map((dataset) => (
          <option key={dataset.dataset_id} value={dataset.dataset_id}>
            {dataset.filename} ({dataset.row_count.toLocaleString()} rows)
          </option>
        ))}
      </select>

      {!isLoading && datasets.length === 0 && (
        <p className="dataset-message">
          No datasets available. Upload a CSV file from the Datasets page first.
        </p>
      )}

      <label htmlFor="question">YOUR QUESTION</label>

      <textarea
        id="question"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="e.g. What are the main trends in this dataset?"
        rows={4}
        maxLength={8192}
        disabled={isSubmitting}
      />

      {error && (
        <p className="dataset-message error" role="alert">
          {error}
        </p>
      )}

      <div className="question-footer">
        <span>
          {selectedDataset
            ? 'Your dataset is ready.'
            : 'Select a dataset to get started.'}
        </span>

        <button
          onClick={() => void handleSubmit()}
          disabled={
            isLoading ||
            isSubmitting ||
            datasets.length === 0 ||
            !selectedDataset ||
            !question.trim()
          }
        >
          {isSubmitting ? 'Submitting...' : 'Run analysis ↗'}
        </button>
      </div>
    </section>
  )
}

export default AskData