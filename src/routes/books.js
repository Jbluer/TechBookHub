const { Hono } = require('hono');
const { html } = require('hono/html');
const { PrismaClient } = require('@prisma/client');
const crypto = require('node:crypto');
const layout = require('../layout');

const prisma = new PrismaClient();
const app = new Hono();

// ログインチェックミドルウェア
const ensureAuthenticated = async (c, next) => {
  const session = c.get('session');
  if (!session?.user) {
    return c.redirect('/login');
  }
  await next();
};

// 本の登録フォーム
app.get('/new', ensureAuthenticated, (c) => {
  const { user } = c.get('session');
  return c.html(
    layout(
      c,
      '技術書の登録',
      html`
        <div class="col-md-8 offset-md-2">
          <h2>おすすめの技術書を登録する</h2>
          <form method="post" action="/books">
            <div class="mb-3">
              <label class="form-label">書籍名</label>
              <input type="text" name="title" class="form-control" required />
            </div>
            <div class="mb-3">
              <label class="form-label">著者・出版社</label>
              <input type="text" name="author" class="form-control" required />
            </div>
            <div class="mb-3">
              <label class="form-label">紹介文・おすすめ理由</label>
              <textarea name="description" class="form-control" rows="4" required></textarea>
            </div>
            <button type="submit" class="btn btn-primary">登録する</button>
          </form>
        </div>
      `,
      user
    )
  );
});

// 本の作成処理
app.post('/', ensureAuthenticated, async (c) => {
  const { user } = c.get('session');
  const body = await c.req.parseBody();
  const bookId = crypto.randomUUID();

  await prisma.book.create({
    data: {
      bookId,
      title: body.title,
      author: body.author,
      description: body.description,
      createdBy: user.id,
      updatedAt: new Date(),
    },
  });

  return c.redirect(`/books/${bookId}`);
});

// 本の詳細画面（ステータス切り替え & レビュー一覧）
app.get('/:bookId', async (c) => {
  const bookId = c.req.param('bookId');
  const session = c.get('session');
  const user = session?.user;

  const book = await prisma.book.findUnique({
    where: { bookId },
    include: {
      user: true,
      readingStatuses: true,
      reviews: { include: { user: true } },
    },
  });

  if (!book) return c.notFound();

  // 現在ログインユーザーの読書ステータス
  const myStatus = user
    ? book.readingStatuses.find((s) => s.userId === user.id)?.status ?? 0
    : 0;

  // 自分のレビュー
  const myReview = user
    ? book.reviews.find((r) => r.userId === user.id)?.reviewText ?? ''
    : '';

  return c.html(
    layout(
      c,
      book.title,
      html`
        <div class="card mb-4">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h3>${book.title}</h3>
            ${user && user.id === book.createdBy
              ? html`
                  <form method="post" action="/books/${book.bookId}/delete" onsubmit="return confirm('本当に削除しますか？');">
                    <button class="btn btn-outline-danger btn-sm">削除</button>
                  </form>
                `
              : ''}
          </div>
          <div class="card-body">
            <h5 class="text-muted">著者: ${book.author}</h5>
            <p class="mt-3">${book.description}</p>
            <p class="text-muted small">登録者: ${book.user.username}</p>
          </div>
        </div>

        ${user
          ? html`
              <div class="card mb-4">
                <div class="card-body">
                  <h5 class="card-title">あなたの読書ステータス</h5>
                  <div class="btn-group" role="group">
                    <button
                      class="btn ${myStatus === 0 ? 'btn-primary' : 'btn-outline-primary'} status-btn"
                      data-book-id="${book.bookId}"
                      data-user-id="${user.id}"
                      data-status="0"
                    >気になる / 積読</button>
                    <button
                      class="btn ${myStatus === 1 ? 'btn-primary' : 'btn-outline-primary'} status-btn"
                      data-book-id="${book.bookId}"
                      data-user-id="${user.id}"
                      data-status="1"
                    >読書中</button>
                    <button
                      class="btn ${myStatus === 2 ? 'btn-primary' : 'btn-outline-primary'} status-btn"
                      data-book-id="${book.bookId}"
                      data-user-id="${user.id}"
                      data-status="2"
                    >読了！</button>
                  </div>
                </div>
              </div>

              <div class="card mb-4">
                <div class="card-body">
                  <h5 class="card-title">あなたのレビュー</h5>
                  <p id="self-review" class="bg-light p-3 rounded">${myReview || 'まだレビューはありません'}</p>
                  <button
                    id="self-review-btn"
                    class="btn btn-secondary btn-sm"
                    data-book-id="${book.bookId}"
                    data-user-id="${user.id}"
                  >レビューを編集・投稿する</button>
                </div>
              </div>
            `
          : html`<p><a href="/login">ログイン</a>するとステータス管理やレビュー投稿ができます。</p>`}

        <h4>みんなのレビュー (${book.reviews.length}件)</h4>
        <div class="list-group">
          ${book.reviews.map(
            (r) => html`
              <div class="list-group-item">
                <div class="d-flex w-100 justify-content-between">
                  <h6 class="mb-1">${r.user.username}</h6>
                </div>
                <p class="mb-1">${r.reviewText}</p>
              </div>
            `
          )}
        </div>
      `,
      user
    )
  );
});

// 本の削除
app.post('/:bookId/delete', ensureAuthenticated, async (c) => {
  const { user } = c.get('session');
  const bookId = c.req.param('bookId');

  const book = await prisma.book.findUnique({ where: { bookId } });
  if (!book || book.createdBy !== user.id) {
    return c.notFound();
  }

  await prisma.book.delete({ where: { bookId } });
  return c.redirect('/');
});

module.exports = app;