import CampaignVariable from '#models/campaign_variable'
import FollowerCampaign from '#models/follower_campaign'

export type VariableType = 'follower_count'

export interface FollowerCountConfig {
  rounding: 'none' | 'hundreds' | 'thousands'
}

export interface VariableResolution {
  [variableName: string]: string | number
}

export default class VariableService {
  /**
   * Créer une nouvelle variable pour une campagne
   */
  async createVariable(
    campaignId: number,
    name: string,
    type: VariableType,
    configuration: Record<string, any>
  ): Promise<CampaignVariable> {
    // Vérifier que le nom n'existe pas déjà pour cette campagne
    const existing = await CampaignVariable.query()
      .where('campaign_id', campaignId)
      .where('name', name)
      .first()

    if (existing) {
      throw new Error(`Variable with name "${name}" already exists for this campaign`)
    }

    // Valider la configuration selon le type
    this.validateConfiguration(type, configuration)

    const variable = await CampaignVariable.create({
      campaignId,
      name,
      type,
      configuration,
    })

    return variable
  }

  /**
   * Mettre à jour une variable
   */
  async updateVariable(
    variableId: number,
    updates: Partial<{
      name: string
      type: VariableType
      configuration: Record<string, any>
    }>
  ): Promise<CampaignVariable> {
    const variable = await CampaignVariable.findOrFail(variableId)

    if (updates.name && updates.name !== variable.name) {
      // Vérifier que le nouveau nom n'existe pas déjà
      const existing = await CampaignVariable.query()
        .where('campaign_id', variable.campaignId)
        .where('name', updates.name)
        .whereNot('id', variableId)
        .first()

      if (existing) {
        throw new Error(`Variable with name "${updates.name}" already exists for this campaign`)
      }
    }

    if (updates.type && updates.configuration) {
      this.validateConfiguration(updates.type, updates.configuration)
    }

    variable.merge(updates)
    await variable.save()

    return variable
  }

  /**
   * Supprimer une variable
   */
  async deleteVariable(variableId: number): Promise<void> {
    const variable = await CampaignVariable.findOrFail(variableId)
    await variable.delete()
  }

  /**
   * Récupérer toutes les variables d'une campagne
   */
  async getCampaignVariables(campaignId: number): Promise<CampaignVariable[]> {
    return await CampaignVariable.query()
      .where('campaign_id', campaignId)
      .orderBy('created_at', 'asc')
  }

  /**
   * Résoudre toutes les variables pour un follower donné
   */
  async resolveVariables(
    campaignId: number,
    followerCampaign: FollowerCampaign
  ): Promise<VariableResolution> {
    const variables = await this.getCampaignVariables(campaignId)
    const resolution: VariableResolution = {}

    for (const variable of variables) {
      try {
        const value = await this.resolveVariable(variable, followerCampaign)
        resolution[variable.name] = value
      } catch (error) {
        console.error(`Error resolving variable ${variable.name}:`, error)
        // Utiliser une valeur par défaut en cas d'erreur
        resolution[variable.name] = this.getDefaultValue(variable.type as VariableType)
      }
    }

    return resolution
  }

  /**
   * Résoudre une variable spécifique pour un follower
   */
  private async resolveVariable(
    variable: CampaignVariable,
    followerCampaign: FollowerCampaign
  ): Promise<string | number> {
    switch (variable.type) {
      case 'follower_count':
        return this.resolveFollowerCount(variable, followerCampaign)
      default:
        throw new Error(`Unknown variable type: ${variable.type}`)
    }
  }

  /**
   * Résoudre une variable de type follower_count
   */
  private resolveFollowerCount(
    variable: CampaignVariable,
    followerCampaign: FollowerCampaign
  ): string | number {
    const followersCount = followerCampaign.followersCount || 0
    const config = variable.configuration as FollowerCountConfig

    if (!config?.rounding || config.rounding === 'none') {
      return followersCount
    }

    switch (config.rounding) {
      case 'thousands':
        if (followersCount >= 1000) {
          return Math.round(followersCount / 1000) + 'k'
        }
        return followersCount
      case 'hundreds':
        if (followersCount >= 1000) {
          return (followersCount / 1000).toFixed(1) + 'k'
        }
        return followersCount
      default:
        return followersCount
    }
  }

  /**
   * Valider la configuration d'une variable selon son type
   */
  private validateConfiguration(type: VariableType, configuration: Record<string, any>): void {
    switch (type) {
      case 'follower_count':
        this.validateFollowerCountConfig(configuration)
        break
      default:
        throw new Error(`Unknown variable type: ${type}`)
    }
  }

  /**
   * Valider la configuration d'une variable follower_count
   */
  private validateFollowerCountConfig(config: any): void {
    if (config.rounding && !['none', 'hundreds', 'thousands'].includes(config.rounding)) {
      throw new Error('rounding must be one of: none, hundreds, thousands')
    }
  }

  /**
   * Obtenir une valeur par défaut selon le type de variable
   */
  private getDefaultValue(type: VariableType): string | number {
    switch (type) {
      case 'follower_count':
        return 0
      default:
        return ''
    }
  }

  /**
   * Remplacer les variables dans un template de message
   */
  replaceVariablesInMessage(message: string, variables: VariableResolution): string {
    let result = message

    for (const [variableName, value] of Object.entries(variables)) {
      const placeholder = `{${variableName}}`
      result = result.replace(new RegExp(placeholder, 'g'), String(value))
    }

    return result
  }

  /**
   * Extraire les noms de variables utilisées dans un message
   */
  extractVariableNames(message: string): string[] {
    const regex = /\{([^}]+)\}/g
    const matches = []
    let match

    while ((match = regex.exec(message)) !== null) {
      matches.push(match[1])
    }

    return [...new Set(matches)] // Supprimer les doublons
  }

  /**
   * Valider qu'un message n'utilise que des variables définies
   */
  async validateMessageVariables(campaignId: number, message: string): Promise<{
    isValid: boolean
    missingVariables: string[]
  }> {
    const usedVariables = this.extractVariableNames(message)
    const definedVariables = await this.getCampaignVariables(campaignId)
    const definedVariableNames = definedVariables.map(v => v.name)

    const missingVariables = usedVariables.filter(
      name => !definedVariableNames.includes(name)
    )

    return {
      isValid: missingVariables.length === 0,
      missingVariables,
    }
  }
}
