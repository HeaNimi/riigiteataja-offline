import { getMethod, readBody } from 'h3'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createMcpServer } from '../utils/mcp'

export default defineEventHandler(async (event) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  const server = createMcpServer()
  await server.connect(transport)
  const body = getMethod(event) === 'POST' ? await readBody(event) : undefined
  await transport.handleRequest(event.node.req, event.node.res, body)
  return undefined
})
