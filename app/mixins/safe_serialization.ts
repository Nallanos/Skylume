import { BaseModel } from '@adonisjs/lucid/orm'

/**
 * Safe Serialization Base Class
 * Provides safe serialization methods for models that might have problematic JSON fields
 */
export class SafeSerializationModel extends BaseModel {
  /**
   * Safe serialization method that handles JSON parsing errors gracefully
   * Override this method in your model to provide custom fallback serialization
   */
  toSafeJSON(): Record<string, any> {
    try {
      return this.toJSON()
    } catch (error) {
      console.error(`Error serializing ${this.constructor.name}:`, error, 'ID:', this.$primaryKeyValue)
      
      // Default fallback: return basic attributes without computed properties
      const attributes: Record<string, any> = {}
      
      // Get all column names from the model
      const columns = (this.constructor as any).$columnsDefinitions
      
      for (const [key] of columns) {
        try {
          // Skip problematic fields that might contain invalid JSON
          if (key.includes('embedding') || key.includes('metadata')) {
            attributes[key] = null
          } else {
            attributes[key] = (this as any)[key]
          }
        } catch (fieldError) {
          console.warn(`Skipping problematic field ${key}:`, fieldError)
          attributes[key] = null
        }
      }
      
      return attributes
    }
  }

  /**
   * Batch safe serialization for arrays of models
   */
  static toSafeJSONArray(models: InstanceType<typeof BaseModel>[]): Record<string, any>[] {
    return models.map((model) => {
      if ('toSafeJSON' in model && typeof model.toSafeJSON === 'function') {
        return (model as any).toSafeJSON()
      }
      try {
        return model.toJSON()
      } catch (error) {
        console.error(`Error serializing ${model.constructor.name}:`, error)
        return { id: (model as any).$primaryKeyValue, error: 'Serialization failed' }
      }
    })
  }
}

/**
 * Backward compatibility: export as mixin function
 */
export default function SafeSerialization<T extends typeof BaseModel>(_superclass: T) {
  return SafeSerializationModel as any
}
