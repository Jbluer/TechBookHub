const { Hono } = require('hono');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = new Hono();

app.post('/:bookId/users/:userId', async (c) => {
  const session = c.get('session');
  const bookId = c.req.param('bookId');
  const userId = parseInt(c.req.param('userId'), 10);
  const { reviewText } = await c.req.json();

  if (!session?.user || session.user.id !== userId) {
    return c.json({ status: 'NG', message: 'Forbidden' }, 403);
  }

  const result = await prisma.review.upsert({
    where: { reviewCompositeId: `${bookId}_${userId}` },
    update: { reviewText, updatedAt: new Date() },
    create: {
      reviewCompositeId: `${bookId}_${userId}`,
      bookId,
      userId,
      reviewText,
      updatedAt: new Date(),
    },
  });

  return c.json({ status: 'OK', reviewText: result.reviewText });
});

module.exports = app;