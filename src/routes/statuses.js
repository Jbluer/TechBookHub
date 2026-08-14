const { Hono } = require('hono');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = new Hono();

app.post('/:bookId/users/:userId', async (c) => {
  const session = c.get('session');
  const bookId = c.req.param('bookId');
  const userId = parseInt(c.req.param('userId'), 10);
  const { status } = await c.req.json();

  if (!session?.user || session.user.id !== userId) {
    return c.json({ status: 'NG', message: 'Forbidden' }, 403);
  }

  const result = await prisma.readingStatus.upsert({
    where: { readingStatusCompositeId: `${bookId}_${userId}` },
    update: { status: parseInt(status, 10) },
    create: {
      readingStatusCompositeId: `${bookId}_${userId}`,
      bookId,
      userId,
      status: parseInt(status, 10),
    },
  });

  return c.json({ status: 'OK', currentStatus: result.status });
});

module.exports = app;