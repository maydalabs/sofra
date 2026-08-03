import { describe, expect, it } from 'vitest'

import { DomainTransitionError, transitionHostedTable } from './lifecycle'

describe('hosted-table lifecycle', () => {
  it('allows human-reviewed publication flow', () => {
    expect(transitionHostedTable('draft', 'submitted')).toBe('submitted')
    expect(transitionHostedTable('submitted', 'approved')).toBe('approved')
    expect(transitionHostedTable('approved', 'published')).toBe('published')
  })

  it('prevents a host from publishing a draft directly', () => {
    expect(() => transitionHostedTable('draft', 'published')).toThrow(
      DomainTransitionError,
    )
  })

  it('does not let completed tables return to publication', () => {
    expect(() => transitionHostedTable('completed', 'published')).toThrow(
      /cannot move/i,
    )
  })
})
