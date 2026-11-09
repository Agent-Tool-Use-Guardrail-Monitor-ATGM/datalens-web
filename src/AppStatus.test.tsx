import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import AppStatus from './AppStatus'

describe('AppStatus', () => {
  it('shows the loading screen', () => {
    render(<AppStatus status="loading" />)

    expect(
      screen.getByRole('heading', { name: 'Loading DataLens' }),
    ).toBeInTheDocument()

    expect(document.querySelector('.loading-spinner')).toBeInTheDocument()
  })

  it('shows the signed-out screen', () => {
    render(<AppStatus status="signed-out" />)

    expect(
      screen.getByRole('heading', { name: 'You are not signed in' }),
    ).toBeInTheDocument()
  })

  it('shows the access-denied screen', () => {
    render(<AppStatus status="access-denied" />)

    expect(
      screen.getByRole('heading', { name: 'Access denied' }),
    ).toBeInTheDocument()
  })

  it('shows the unavailable screen', () => {
    render(<AppStatus status="unavailable" />)

    expect(
      screen.getByRole('heading', { name: 'Service unavailable' }),
    ).toBeInTheDocument()
  })
})