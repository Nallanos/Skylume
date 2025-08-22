import vine from '@vinejs/vine'

export const variableCreateValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100),
    type: vine.enum(['follower_count']),
    configuration: vine.object({
      rounding: vine.enum(['none', 'hundreds', 'thousands']).optional(),
    }).optional(),
  })
)

export const variableUpdateValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100).optional(),
    type: vine.enum(['follower_count']).optional(),
    configuration: vine.object({
      rounding: vine.enum(['none', 'hundreds', 'thousands']).optional(),
    }).optional(),
  })
)
