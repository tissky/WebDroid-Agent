export class OpenAiClientError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OpenAiClientError'
  }
}
