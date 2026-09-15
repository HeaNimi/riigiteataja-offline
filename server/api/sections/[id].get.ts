import { createError, getRouterParam } from 'h3'
import { getSection } from '../../utils/acts'

export default defineEventHandler((event) => {
  const section = getSection(getRouterParam(event, 'id') || '')
  if (!section) throw createError({ statusCode: 404, statusMessage: 'Section not found' })
  return section
})
