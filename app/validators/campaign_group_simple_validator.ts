import vine from '@vinejs/vine'

// Validateur pour le format simple des groupes (frontend)
export const groupSimpleCreateValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100),
    conditions: vine.object({
      field: vine.enum(['followers_count']),
      operator: vine.enum(['gte', 'lte', 'gt', 'lt', 'eq']),
      value: vine.string().trim().minLength(1),
    }),
    priority: vine.number().min(0).optional(),
    message: vine.string().trim().optional(),
    target_count: vine.number().min(0).optional(),
    explicit_links: vine.array(
      vine.object({
        text: vine.string().trim().minLength(1),
        url: vine.string().trim().url(),
      })
    ).optional(),
  })
)

export const groupSimpleUpdateValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100).optional(),
    conditions: vine.object({
      field: vine.enum(['followers_count']),
      operator: vine.enum(['gte', 'lte', 'gt', 'lt', 'eq']),
      value: vine.string().trim().minLength(1),
    }).optional(),
    priority: vine.number().min(0).optional(),
    message: vine.string().trim().optional(),
    target_count: vine.number().min(0).optional(),
    explicit_links: vine.array(
      vine.object({
        text: vine.string().trim().minLength(1),
        url: vine.string().trim().url(),
      })
    ).optional(),
  })
)
