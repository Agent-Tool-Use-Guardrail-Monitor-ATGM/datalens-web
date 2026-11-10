
import { describe, expect, it } from 'vitest'
import { isMockDataEnabled } from './config'

describe('isMockDataEnabled', () => {
  it('enables mock data in development when explicitly enabled', () => {
    expect(
      isMockDataEnabled({
        DEV: true,
        VITE_USE_MOCK_DATA: 'true',
      }),
    ).toBe(true)
  })

  it('disables mock data when the setting is false', () => {
    expect(
      isMockDataEnabled({
        DEV: true,
        VITE_USE_MOCK_DATA: 'false',
      }),
    ).toBe(false)
  })

  it('never enables mock data in production', () => {
    expect(
      isMockDataEnabled({
        DEV: false,
        VITE_USE_MOCK_DATA: 'true',
      }),
    ).toBe(false)
  })
})
