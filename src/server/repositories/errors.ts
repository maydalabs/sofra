export class RepositoryUnavailableError extends Error {
  constructor(message = 'The configured data repository is unavailable') {
    super(message)
    this.name = 'RepositoryUnavailableError'
  }
}

export class RepositoryQueryError extends Error {
  constructor(operation: string, causeMessage: string) {
    super(`Repository operation “${operation}” failed: ${causeMessage}`)
    this.name = 'RepositoryQueryError'
  }
}

export class RepositoryDataError extends Error {
  constructor(field: string) {
    super(`Repository returned an incomplete required field: ${field}`)
    this.name = 'RepositoryDataError'
  }
}
