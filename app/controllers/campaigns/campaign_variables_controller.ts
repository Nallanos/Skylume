import type { HttpContext } from '@adonisjs/core/http'
import VariableService, { VariableType } from '#services/variable_service'
import { variableCreateValidator, variableUpdateValidator } from '#validators/campaign_variable_validator'

export default class CampaignVariablesController {
  private variableService = new VariableService()

  /**
   * GET /campaign/:id/variables
   * Récupérer toutes les variables d'une campagne
   */
  async index({ params, response }: HttpContext) {
    try {
      const campaignId = params.id
      const variables = await this.variableService.getCampaignVariables(campaignId)
      
      return response.ok({
        success: true,
        data: variables,
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to fetch variables',
        error: error.message,
      })
    }
  }

  /**
   * POST /campaign/:id/variables
   * Créer une nouvelle variable
   */
  async store({ params, request, response }: HttpContext) {
    try {
      const campaignId = params.id
      const payload = await request.validateUsing(variableCreateValidator)
      
      const variable = await this.variableService.createVariable(
        campaignId,
        payload.name,
        payload.type as VariableType,
        payload.configuration || {}
      )
      
      return response.status(201).json({
        success: true,
        data: variable,
        message: 'Variable created successfully',
      })
    } catch (error) {
      return response.status(400).json({
        success: false,
        message: 'Failed to create variable',
        error: error.message,
      })
    }
  }

  /**
   * PUT /campaign/:id/variables/:variableId
   * Mettre à jour une variable
   */
  async update({ params, request, response }: HttpContext) {
    try {
      const { variableId } = params
      const payload = await request.validateUsing(variableUpdateValidator)
      
      const variable = await this.variableService.updateVariable(variableId, payload)
      
      return response.ok({
        success: true,
        data: variable,
        message: 'Variable updated successfully',
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to update variable',
        error: error.message,
      })
    }
  }

  /**
   * DELETE /campaign/:id/variables/:variableId
   * Supprimer une variable
   */
  async destroy({ params, response }: HttpContext) {
    try {
      const { variableId } = params
      await this.variableService.deleteVariable(variableId)
      
      return response.ok({
        success: true,
        message: 'Variable deleted successfully',
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to delete variable',
        error: error.message,
      })
    }
  }

  /**
   * POST /campaign/:id/variables/validate-message
   * Valider qu'un message utilise des variables définies
   */
  async validateMessage({ params, request, response }: HttpContext) {
    try {
      const campaignId = params.id
      const { message } = request.only(['message'])
      
      const validation = await this.variableService.validateMessageVariables(campaignId, message)
      
      return response.ok({
        success: true,
        data: validation,
      })
    } catch (error) {
      return response.badRequest({
        success: false,
        message: 'Failed to validate message',
        error: error.message,
      })
    }
  }
}