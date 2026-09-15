import { createError, getRouterParam } from 'h3'
import { getAct } from '../../utils/acts'

export default defineEventHandler((event) => {
  const act = getAct(getRouterParam(event, 'id') || '')
  if (!act) throw createError({ statusCode: 404, statusMessage: 'Act not found' })
  return act
})
