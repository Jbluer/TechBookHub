'use strict';

const { Hono } = require('hono');
const { html } = require('hono/html');
const { PrismaClient } = require('@prisma/client');
const layout = require('../layout');

const prisma = new PrismaClient();
const app = new Hono();

app.get('/', async (c) => {
  const session = c.get('session');
  const user = session?.user;

  // 登録されている本の一覧を取得
  const books = await prisma.book.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      user: true,
      reviews: true,
    },
  });

  return c.html(
    layout(
      c,
      'トップページ',
      html`
        <div class="p-5 mb-4 bg-light rounded-3 border">
          <div class="container-fluid py-3">
            <h1 class="display-5 fw-bold">TechBookHub へようこそ！</h1>
            <p class="col-md-8 fs-4">
              おすすめの技術書を共有・レビューしたり、読書ステータスを管理できるサービスです。
            </p>
            ${user
              ? html`<a href="/books/new" class="btn btn-primary btn-lg">おすすめの本を登録する</a>`
              : html`<a href="/login" class="btn btn-primary btn-lg">GitHubでログインして本を登録</a>`}
          </div>
        </div>

        <h3 class="mb-3">おすすめ本の一覧</h3>
        <div class="row">
          ${books.length === 0
            ? html`<p class="text-muted">まだ登録されている本がありません。</p>`
            : books.map(
                (book) => html`
                  <div class="col-md-6 mb-4">
                    <div class="card h-100 shadow-sm hover-shadow" style="transition: box-shadow 0.15s ease-in-out, transform 0.15s ease-in-out;">
                      <div class="card-body">
                        <h5 class="card-title">
                          <a href="/books/${book.bookId}" class="text-decoration-none text-dark stretched-link">
                            ${book.title}
                          </a>
                        </h5>
                        <h6 class="card-subtitle mb-2 text-muted">著者: ${book.author}</h6>
                        <p class="card-text">${book.description}</p>
                      </div>
                      <div class="card-footer bg-transparent text-muted small d-flex justify-content-between">
                        <span>登録者: ${book.user.username}</span>
                        <span>レビュー: ${book.reviews.length}件</span>
                      </div>
                    </div>
                  </div>
                `
              )}
        </div>
      `
    )
  );
});

// ログインチェックミドルウェア
const ensureAuthenticated = async (c, next) => {
  const session = c.get('session');
  if (!session?.user) {
    return c.redirect('/login');
  }
  await next();
};

// 気になる/積読リスト
app.get('/mystatus/:status', ensureAuthenticated, async (c) => {
  const { user } = c.get('session');
  const status = parseInt(c.req.param('status'), 10);
  const statusLabels = { 0: '気になる / 積読', 1: '読書中', 2: '読了' };

  const books = await prisma.book.findMany({
    where: {
      readingStatuses: { some: { userId: user.id, status } },
    },
    orderBy: { updatedAt: 'desc' },
    include: { user: true, reviews: true },
  });

  return c.html(
    layout(
      c,
      statusLabels[status] ?? 'マイリスト',
      html`
        <h3 class="mb-3">${statusLabels[status] ?? ''}の本一覧</h3>
        <div class="row">
          ${books.length === 0
            ? html`<p class="text-muted">該当する本がありません。</p>`
            : books.map(
                (book) => html`
                  <div class="col-md-6 mb-4">
                    <div class="card h-100 shadow-sm hover-shadow" style="transition: box-shadow 0.15s ease-in-out, transform 0.15s ease-in-out;">
                      <div class="card-body">
                        <h5 class="card-title">
                          <a href="/books/${book.bookId}" class="text-decoration-none text-dark stretched-link">
                            ${book.title}
                          </a>
                        </h5>
                        <h6 class="card-subtitle mb-2 text-muted">著者: ${book.author}</h6>
                        <p class="card-text">${book.description}</p>
                      </div>
                      <div class="card-footer bg-transparent text-muted small d-flex justify-content-between">
                        <span>登録者: ${book.user.username}</span>
                        <span>レビュー: ${book.reviews.length}件</span>
                      </div>
                    </div>
                  </div>
                `
              )}
        </div>
      `
    )
  );
});

module.exports = app;