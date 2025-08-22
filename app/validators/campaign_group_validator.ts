import vine from '@vinejs/vine'

export const groupCreateValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100),
    conditions: vine.object({
      conditions: vine.array(
        vine.object({
          type: vine.enum(['interest_level', 'follower_count']),
          operator: vine.enum(['equals', 'greater_than', 'less_than', 'between', 'at_least']),
          value: vine.any(), // Peut être string, number selon le type
          secondValue: vine.any().optional(), // Pour l'opérateur 'between'
        })
      ).minLength(1),
      logic: vine.enum(['AND', 'OR']),
    }),
    message: vine.string().trim().minLength(1),
    order: vine.number().min(1).optional(),
  })
)

export const groupUpdateValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100).optional(),
    conditions: vine.object({
      conditions: vine.array(
        vine.object({
          type: vine.enum(['interest_level', 'follower_count']),
          operator: vine.enum(['equals', 'greater_than', 'less_than', 'between', 'at_least']),
          value: vine.any(),
          secondValue: vine.any().optional(),
        })
      ).minLength(1),
      logic: vine.enum(['AND', 'OR']),
    }).optional(),
    message: vine.string().trim().minLength(1).optional(),
    order: vine.number().min(1).optional(),
  })
)
