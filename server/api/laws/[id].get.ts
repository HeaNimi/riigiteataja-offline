import { createError, getRouterParam } from 'h3'
import { getAct } from '../../utils/acts'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  const law = getAct(id || '')
  if (!law) throw createError({ statusCode: 404, statusMessage: 'Law not found' })
  return law
})
