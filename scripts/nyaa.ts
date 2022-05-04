import type { Subscription } from '@prisma/client'
import type { OnLoad } from 'chooksie'
import type { MessageEmbedAuthor, TextChannel } from 'discord.js'
import { MessageEmbed } from 'discord.js'
import { XMLParser } from 'fast-xml-parser'
import { setInterval as interval } from 'node:timers/promises'
import db from '../prisma'

interface Feed {
  rss: { channel: { item: NyaaItem[] } }
}

interface NyaaItem {
  title: string
  link: string
  guid: string
  pubDate: string
  'nyaa:seeders': number
  'nyaa:leechers': number
  'nyaa:downloads': number
  'nyaa:infoHash': string
  'nyaa:categoryId': string
  'nyaa:category': string
  'nyaa:size': string
  'nyaa:comments': 0
  'nyaa:trusted': string
  'nyaa:remake': string
  description: string
}

const parser = new XMLParser()
const parse = (data: string) => {
  const feed = parser.parse(data) as Feed
  return feed.rss.channel.item
}

async function getRawFeed() {
  const res = await fetch('https://nyaa.si/rss', {
    headers: { 'Accept-Encoding': 'gzip, deflate, br' },
  })
  return res.text()
}

function diffChanges(oldFeed: NyaaItem[], newFeed: NyaaItem[]) {
  let latestItem = newFeed[0]
  const lastItem = oldFeed[0]

  if (latestItem.guid === lastItem.guid) {
    return [latestItem]
  }

  let i = 0
  while (latestItem.guid !== lastItem.guid) {
    latestItem = newFeed[++i]
  }

  return newFeed.slice(0, i)
}

async function* watch() {
  let lastFeed = await getRawFeed()
  for await (const _ of interval(15 * 1000)) {
    const latestFeed = await getRawFeed()
    if (lastFeed !== latestFeed) {
      const changes = diffChanges(parse(lastFeed), parse(latestFeed))
      if (changes.length > 0) {
        yield changes
      }
      lastFeed = latestFeed
    }
  }
}

const author: MessageEmbedAuthor = {
  iconURL: 'https://nyaa.si/static/favicon.png',
  name: 'Found new release!',
  url: 'https://nyaa.si/',
}

function newFeedEmbed(feed: NyaaItem) {
  return new MessageEmbed()
    .setColor('#3582F7')
    .setURL(feed.guid)
    .setTitle(feed.title)
    .setAuthor(author)
    .addField('⬆️ Seeders', feed['nyaa:seeders'].toString(), true)
    .addField('⬇️ Leechers', feed['nyaa:leechers'].toString(), true)
    .addField('✅ Downloads', feed['nyaa:downloads'].toString(), true)
    .addField('Torrent File', `[${feed['nyaa:size']}](${feed.link})`)
    .setFooter({ text: feed['nyaa:category'] })
    .setTimestamp(new Date(feed.pubDate))
}

function filterEntries(subs: Subscription[], entries: NyaaItem[]): NyaaItem[] {
  const include: NyaaItem[] = []
  const exclude = entries.map((item, i) => ({
    index: i,
    title: item.title.toLowerCase(),
  }))

  for (let i = 0, n = subs.length; i < n || exclude.length > 0; i++) {
    const q = subs[i].title.toLowerCase()
    // go in reverse so splice works properly
    // eslint-disable-next-line for-direction
    for (let j = exclude.length - 1; j < 0; j--) {
      const target = exclude[j]
      // if target has q, include target
      if (target.title.includes(q)) {
        include.push(entries[target.index])
        exclude.splice(j, 1)
      }
    }
  }

  return include
}

export const chooksOnLoad: OnLoad = async ({ logger, client }) => {
  const channel = await client.channels.fetch(process.env.FEED_CHANNEL) as TextChannel

  const send = async (items: NyaaItem[]) => {
    const embeds = items.map(newFeedEmbed)
    await channel.send({ embeds })
  }

  const feed = watch()
  logger.info('listening to nyas.si rss feed')

  for await (const items of feed) {
    logger.info(`found ${items.length} new releases`)
    // @Choooks22: This gets ALL the subscriptions each time a new entry is added.
    // Consider caching or user more advanced queries.
    const subs = await db.subscription.findMany()
    const filtered = filterEntries(subs, items)

    if (filtered.length > 10) {
      logger.info(`matched ${filtered.length} entries`)
      for (let i = 0, n = filtered.length; i < n; i += 10) {
        await send(items.slice(i, i + 10))
      }
    } else if (filtered.length > 0) {
      logger.info(`matched ${filtered.length} entries`)
      await send(items)
    } else {
      logger.info('matched no entries')
    }
  }
}
