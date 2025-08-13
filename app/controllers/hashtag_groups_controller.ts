import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import HashtagGroup from '#models/hashtag_group'
import HashtagGroupItem from '#models/hashtag_group_item'
import vine from '@vinejs/vine'

const createGroupValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100),
    description: vine.string().trim().maxLength(500).optional(),
    hashtags: vine.array(vine.string().trim().minLength(1).maxLength(100)).maxLength(30)
  })
)

const updateGroupValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100),
    description: vine.string().trim().maxLength(500).optional()
  })
)

const addHashtagValidator = vine.compile(
  vine.object({
    hashtag: vine.string().trim().minLength(1).maxLength(100)
  })
)

@inject()
export default class HashtagGroupsController {
  /**
   * Afficher la page de gestion des groupes de hashtags
   */
  async index({ auth, inertia }: HttpContext) {
    const user = auth.user!
    
    const groups = await HashtagGroup.query()
      .where('userId', user.id)
      .preload('items', (query) => {
        query.orderBy('position')
      })
      .orderBy('createdAt', 'desc')

    return inertia.render('hashtag-groups/index', {
      groups: groups.map(group => ({
        id: group.id,
        name: group.name,
        description: group.description,
        hashtags: group.items.map(item => item.hashtag),
        createdAt: group.createdAt.toFormat('dd/MM/yyyy')
      }))
    })
  }

  /**
   * Créer un nouveau groupe de hashtags
   */
  async store({ auth, request, response, session }: HttpContext) {
    const user = auth.user!
    
    try {
      const data = await request.validateUsing(createGroupValidator)
      
      // Vérifier le nombre de groupes (limite à 20)
      const groupCount = await HashtagGroup.query().where('userId', user.id).count('* as total')
      if (groupCount[0].$extras.total >= 20) {
        session.flash('error', 'Vous ne pouvez pas avoir plus de 20 groupes de hashtags')
        return response.redirect().back()
      }

      // Vérifier l'unicité du nom pour cet utilisateur
      const existingGroup = await HashtagGroup.query()
        .where('userId', user.id)
        .where('name', data.name)
        .first()

      if (existingGroup) {
        session.flash('error', 'Un groupe avec ce nom existe déjà')
        return response.redirect().back()
      }

      // Créer le groupe
      const group = await HashtagGroup.create({
        userId: user.id,
        name: data.name,
        description: data.description
      })

      // Ajouter les hashtags
      if (data.hashtags && data.hashtags.length > 0) {
        const items = data.hashtags.map((hashtag, index) => ({
          hashtagGroupId: group.id,
          hashtag: this.cleanHashtag(hashtag),
          position: index
        }))
        
        await HashtagGroupItem.createMany(items)
      }

      session.flash('success', 'Groupe de hashtags créé avec succès')
      return response.redirect().toRoute('hashtag-groups.index')
    } catch (error) {
      session.flash('error', 'Erreur lors de la création du groupe')
      return response.redirect().back()
    }
  }

  /**
   * Afficher un groupe spécifique
   */
  async show({ auth, params, response, inertia }: HttpContext) {
    const user = auth.user!
    
    const group = await HashtagGroup.query()
      .where('id', params.id)
      .where('userId', user.id)
      .preload('items', (query) => {
        query.orderBy('position')
      })
      .first()

    if (!group) {
      return response.notFound()
    }

    const groupData = {
      id: group.id,
      name: group.name,
      description: group.description,
      hashtags: group.items.map(item => ({
        id: item.id,
        hashtag: item.hashtag,
        position: item.position
      })),
      createdAt: group.createdAt.toFormat('dd/MM/yyyy')
    }

    return inertia.render('hashtag-groups/show', {
      group: groupData
    })
  }

  /**
   * Mettre à jour un groupe
   */
  async update({ auth, params, request, response, session }: HttpContext) {
    const user = auth.user!
    
    try {
      const data = await request.validateUsing(updateGroupValidator)
      
      const group = await HashtagGroup.query()
        .where('id', params.id)
        .where('userId', user.id)
        .first()

      if (!group) {
        session.flash('error', 'Groupe non trouvé')
        return response.redirect().toRoute('hashtag-groups.index')
      }

      // Vérifier l'unicité du nom si changé
      if (data.name !== group.name) {
        const existingGroup = await HashtagGroup.query()
          .where('userId', user.id)
          .where('name', data.name)
          .whereNot('id', group.id)
          .first()

        if (existingGroup) {
          session.flash('error', 'Un groupe avec ce nom existe déjà')
          return response.redirect().back()
        }
      }

      group.merge(data)
      await group.save()

      session.flash('success', 'Groupe mis à jour avec succès')
      return response.redirect().toRoute('hashtag-groups.index')
    } catch (error) {
      session.flash('error', 'Erreur lors de la mise à jour du groupe')
      return response.redirect().back()
    }
  }

  /**
   * Supprimer un groupe
   */
  async destroy({ auth, params, response, session }: HttpContext) {
    const user = auth.user!
    
    const group = await HashtagGroup.query()
      .where('id', params.id)
      .where('userId', user.id)
      .first()

    if (!group) {
      session.flash('error', 'Groupe non trouvé')
      return response.redirect().toRoute('hashtag-groups.index')
    }

    await group.delete()
    
    session.flash('success', 'Groupe supprimé avec succès')
    return response.redirect().toRoute('hashtag-groups.index')
  }

  /**
   * Ajouter un hashtag à un groupe
   */
  async addHashtag({ auth, params, request, response, session }: HttpContext) {
    const user = auth.user!
    
    try {
      const data = await request.validateUsing(addHashtagValidator)
      
      const group = await HashtagGroup.query()
        .where('id', params.id)
        .where('userId', user.id)
        .preload('items')
        .first()

      if (!group) {
        return response.notFound()
      }

      // Vérifier la limite de hashtags
      if (group.items.length >= 30) {
        session.flash('error', 'Un groupe ne peut pas avoir plus de 30 hashtags')
        return response.redirect().toRoute('hashtag-groups.show', { id: group.id })
      }

      const cleanedHashtag = this.cleanHashtag(data.hashtag)
      
      // Vérifier si le hashtag existe déjà dans ce groupe
      const existingItem = group.items.find(item => item.hashtag.toLowerCase() === cleanedHashtag.toLowerCase())
      if (existingItem) {
        session.flash('error', 'Ce hashtag existe déjà dans ce groupe')
        return response.redirect().toRoute('hashtag-groups.show', { id: group.id })
      }

      await HashtagGroupItem.create({
        hashtagGroupId: group.id,
        hashtag: cleanedHashtag,
        position: group.items.length
      })

      session.flash('success', 'Hashtag ajouté avec succès')
      return response.redirect().toRoute('hashtag-groups.show', { id: group.id })
    } catch (error) {
      session.flash('error', 'Erreur lors de l\'ajout du hashtag')
      return response.redirect().toRoute('hashtag-groups.show', { id: params.id })
    }
  }

  /**
   * Supprimer un hashtag d'un groupe
   */
  async removeHashtag({ auth, params, response, session }: HttpContext) {
    const user = auth.user!
    
    const group = await HashtagGroup.query()
      .where('id', params.groupId)
      .where('userId', user.id)
      .first()

    if (!group) {
      return response.notFound()
    }

    const item = await HashtagGroupItem.query()
      .where('id', params.hashtagId)
      .where('hashtagGroupId', group.id)
      .first()

    if (!item) {
      return response.notFound()
    }

    await item.delete()
    
    session.flash('success', 'Hashtag supprimé avec succès')
    return response.redirect().toRoute('hashtag-groups.show', { id: group.id })
  }

  /**
   * Réorganiser les hashtags dans un groupe
   */
  async reorderHashtags({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    
    try {
      const { hashtagIds } = request.only(['hashtagIds'])
      
      const group = await HashtagGroup.query()
        .where('id', params.id)
        .where('userId', user.id)
        .first()

      if (!group) {
        return response.notFound()
      }

      // Mettre à jour les positions
      for (let i = 0; i < hashtagIds.length; i++) {
        await HashtagGroupItem.query()
          .where('id', hashtagIds[i])
          .where('hashtagGroupId', group.id)
          .update({ position: i })
      }

      return response.json({ success: true })
    } catch (error) {
      return response.status(422).json({ error: 'Erreur lors de la réorganisation' })
    }
  }

  /**
   * API: Récupérer tous les groupes de l'utilisateur (pour le sélecteur)
   */
  async api({ auth, response }: HttpContext) {
    const user = auth.user!
    
    const groups = await HashtagGroup.query()
      .where('userId', user.id)
      .preload('items', (query) => {
        query.orderBy('position')
      })
      .orderBy('name')

    return response.json(
      groups.map(group => ({
        id: group.id,
        name: group.name,
        hashtags: group.items.map(item => item.hashtag)
      }))
    )
  }

  /**
   * Nettoyer et valider un hashtag
   */
  private cleanHashtag(hashtag: string): string {
    // Enlever le # s'il est présent
    let cleaned = hashtag.replace(/^#/, '')
    
    // Supprimer les espaces
    cleaned = cleaned.trim()
    
    // Validation basique (lettres, chiffres, underscore)
    if (!/^[a-zA-Z0-9_]+$/.test(cleaned)) {
      throw new Error('Le hashtag ne peut contenir que des lettres, chiffres et underscores')
    }
    
    return cleaned
  }
}