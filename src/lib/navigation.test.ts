import { describe, expect, it } from 'vitest'

import { isNavigationPathActive } from './navigation'

describe('public navigation state', () => {
  it('marks a section active for its page and descendants', () => {
    expect(isNavigationPathActive('/tables', '/tables')).toBe(true)
    expect(
      isNavigationPathActive('/tables/ayse-levent-sunday-table', '/tables'),
    ).toBe(true)
    expect(isNavigationPathActive('/host/apply', '/host')).toBe(true)
  })

  it('does not mark lookalike or unrelated paths active', () => {
    expect(isNavigationPathActive('/tablespoon', '/tables')).toBe(false)
    expect(isNavigationPathActive('/how-it-works', '/tables')).toBe(false)
    expect(isNavigationPathActive('/tables', '/')).toBe(false)
  })
})
