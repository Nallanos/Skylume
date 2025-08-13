import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'schedulings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('videos').nullable() // JSON string des chemins vers les fichiers vidéo
      table.text('video_alt_texts').nullable() // JSON string des descriptions alternatives pour les vidéos
      table.text('video_thumbnails').nullable() // JSON string des chemins vers les thumbnails générés
      table.text('video_durations').nullable() // JSON string des durées des vidéos en secondes
      table.text('video_sizes').nullable() // JSON string des tailles des fichiers vidéo en bytes
      table.text('video_metadata').nullable() // JSON string des métadonnées additionnelles (dimensions, codec, etc.)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('videos')
      table.dropColumn('video_alt_texts')
      table.dropColumn('video_thumbnails')
      table.dropColumn('video_durations')
      table.dropColumn('video_sizes')
      table.dropColumn('video_metadata')
    })
  }
}