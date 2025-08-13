import HashtagGroup from '#models/hashtag_group'
import HashtagGroupItem from '#models/hashtag_group_item'
import User from '#models/user'

// Script de test pour créer quelques groupes de hashtags
async function createTestData() {
  try {
    // Prendre le premier utilisateur de la base
    const user = await User.first()
    if (!user) {
      console.log('Aucun utilisateur trouvé dans la base de données')
      return
    }

    console.log(`Utilisateur trouvé: ${user.email}`)

    // Créer quelques groupes de test
    const groups = [
      {
        name: 'Tech Posts',
        description: 'Hashtags pour les posts sur la technologie',
        hashtags: ['technology', 'programming', 'developer', 'coding', 'tech']
      },
      {
        name: 'Marketing',
        description: 'Hashtags pour le marketing digital',
        hashtags: ['marketing', 'digital', 'socialmedia', 'branding', 'business']
      },
      {
        name: 'Personal',
        description: 'Hashtags personnels',
        hashtags: ['life', 'thoughts', 'daily', 'personal', 'reflection']
      }
    ]

    for (const groupData of groups) {
      // Vérifier si le groupe existe déjà
      const existingGroup = await HashtagGroup.query()
        .where('userId', user.id)
        .where('name', groupData.name)
        .first()

      if (existingGroup) {
        console.log(`Groupe '${groupData.name}' existe déjà`)
        continue
      }

      // Créer le groupe
      const group = await HashtagGroup.create({
        userId: user.id,
        name: groupData.name,
        description: groupData.description
      })

      // Ajouter les hashtags
      const items = groupData.hashtags.map((hashtag, index) => ({
        hashtagGroupId: group.id,
        hashtag: hashtag,
        position: index
      }))

      await HashtagGroupItem.createMany(items)
      console.log(`Groupe '${groupData.name}' créé avec ${groupData.hashtags.length} hashtags`)
    }

    console.log('Données de test créées avec succès!')
  } catch (error) {
    console.error('Erreur lors de la création des données de test:', error)
  }
}

createTestData()
  .then(() => process.exit(0))
  .catch(console.error)
