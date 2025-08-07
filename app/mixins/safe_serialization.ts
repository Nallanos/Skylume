import { BaseModel } from '@adonisjs/lucid/orm'
import { NormalizeConstructor } from '@adonisjs/lucid/types/helpers'

/**
 * Safe Serialization Mixin
 * Provides safe serialization methods for models that might have problematic JSON fields
 */
export default function SafeSerialization<T extends NormalizeConstructor<typeof BaseModel>>(
  superclass: T
) {
  class SafeSerializationClass extends superclass {
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
        const columns = this.constructor.$columnsDefinitions
        
        for (const [key, column] of columns) {
          try {
            // Skip problematic fields that might contain invalid JSON
            if (key.includes('embedding') || key.includes('metadata')) {
              attributes[key] = null
            } else {
              attributes[key] = this[key]
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
    static toSafeJSONArray<U extends BaseModel>(models: U[]): Record<string, any>[] {
      return models.map((model) => {
        if ('toSafeJSON' in model && typeof model.toSafeJSON === 'function') {
          return model.toSafeJSON()
        }
        try {
          return model.toJSON()
        } catch (error) {
          console.error(`Error serializing ${model.constructor.name}:`, error)
          return { id: model.$primaryKeyValue, error: 'Serialization failed' }
        }
      })
    }
  }

  return SafeSerializationClass
}
