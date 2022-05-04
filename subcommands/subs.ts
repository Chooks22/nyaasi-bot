import { defineOption, defineSlashSubcommand, defineSubcommand } from 'chooksie'
import { MessageEmbed } from 'discord.js'

const setup = async () => (await import('../prisma')).default.subscription

const newSub = defineSubcommand({
  name: 'new',
  description: 'Create a new subscription.',
  type: 'SUB_COMMAND',
  setup,
  async execute({ interaction }) {
    const title = interaction.options.getString('title', true)
    const defer = interaction.deferReply({ ephemeral: true })

    const sub = await this.create({ data: { title } })
    await defer

    const embed = new MessageEmbed()
      .setColor('GREEN')
      .setAuthor({
        iconURL: interaction.user.avatarURL({ size: 64 })!,
        name: 'Created new subscription!',
      })
      .addField('Added subscription for', title)
      .setFooter({ text: `Sub ID: ${sub.id}` })

    await interaction.editReply({ embeds: [embed] })
  },
  options: [
    {
      name: 'title',
      description: 'Title to match. (case insensitive)',
      type: 'STRING',
      required: true,
    },
  ],
})

const rmSub = defineSubcommand({
  name: 'remove',
  description: 'Remove a subscription.',
  type: 'SUB_COMMAND',
  setup,
  async execute({ logger, interaction }) {
    const id = interaction.options.getString('title', true)
    const defer = interaction.deferReply({ ephemeral: true })
    let embed: MessageEmbed

    try {
      await this.delete({ where: { id } })
      embed = new MessageEmbed()
        .setColor('GREEN')
        .setAuthor({
          iconURL: interaction.user.avatarURL({ size: 64 })!,
          name: 'Subscription deleted!',
        })
        .setFooter({ text: `Sub ID: ${id}` })
    } catch (error) {
      logger.error(error)
      embed = new MessageEmbed()
        .setColor('RED')
        .setAuthor({
          iconURL: interaction.user.avatarURL({ size: 64 })!,
          name: 'Could not delete subscription!',
        })
        .setDescription('Make sure the title is correct, and that you\'ve selected the subscription from the menu.')
    }

    await defer
    await interaction.editReply({ embeds: [embed] })
  },
  options: [
    defineOption({
      name: 'title',
      description: 'Title of subscription to delete.',
      type: 'STRING',
      setup,
      async autocomplete({ interaction }) {
        const q = interaction.options.getFocused() as string
        const found = await this.findMany({
          where: {
            title: {
              contains: q,
              mode: 'insensitive',
            },
          },
          take: 25,
        })

        if (found.length) {
          const similar = found.map(sub => ({
            name: sub.title,
            value: sub.id,
          }))

          await interaction.respond(similar)
        }
      },
    }),
  ],
})

const lsSub = defineSubcommand({
  name: 'list',
  description: 'List existing subcommands.',
  type: 'SUB_COMMAND',
  setup,
  async execute({ interaction }) {
    const guild = interaction.guild
    const defer = interaction.deferReply()

    const subs = await this.findMany()
    const icon = guild?.iconURL({ size: 64 })
    let embed: MessageEmbed

    if (subs.length === 0) {
      embed = new MessageEmbed()
        .setColor('RED')
        .setAuthor(guild
          ? { iconURL: icon!, name: 'No subscriptions found!' }
          : { iconURL: icon!, name: 'No subscriptions found!' })
        .setDescription('Create a new subscription using `/subs new`.')
    } else {
      embed = new MessageEmbed()
        .setColor('#3582F7')
        .setAuthor(guild
          ? { iconURL: icon!, name: `Listing subscriptions for ${guild.name}` }
          : { name: 'Listing subscriptions' })
        .setFooter({ text: '@todo: Pagination' })

      for (const sub of await this.findMany()) {
        embed.addField(sub.id, sub.title)
      }
    }

    await defer
    await interaction.editReply({ embeds: [embed] })
  },
})

export default defineSlashSubcommand({
  name: 'subs',
  description: 'Manage subscriptions.',
  options: [newSub, rmSub, lsSub],
})
