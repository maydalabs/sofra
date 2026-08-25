import { describe, expect, it } from 'vitest'

import { formatTableLanguages } from './language'

describe('table language display names', () => {
  it('localizes known language selections for Turkish', () => {
    expect(
      formatTableLanguages(['Turkish', 'English', 'German'], 'tr'),
    ).toEqual(['Türkçe', 'İngilizce', 'Almanca'])
  })

  it('preserves an unknown source label instead of guessing', () => {
    expect(formatTableLanguages(['Ladino'], 'en')).toEqual(['Ladino'])
  })
})
