import { defineEvent } from 'chooksie'

export default defineEvent({
  name: 'ready',
  once: true,
  execute(ctx, client) {
    ctx.logger.info(`logged in as ${client.user.username}`)
  },
})
