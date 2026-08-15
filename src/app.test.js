'use strict';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['query'] });

const testUser = {
  userId: 0,
  username: 'testuser',
};

function mockIronSession() {
  const ironSession = require('iron-session');
  jest.spyOn(ironSession, 'getIronSession').mockImplementation(async () => ({
    user: { login: testUser.username, id: testUser.userId },
    save: jest.fn(),
    destroy: jest.fn(),
  }));
}

// テストで作成したデータを削除
async function deleteBookAggregate(bookId) {
  if (!bookId) return;
  await prisma.readingStatus.deleteMany({ where: { bookId } });
  await prisma.review.deleteMany({ where: { bookId } });
  await prisma.book.deleteMany({ where: { bookId } });
}

// フォームからリクエストを送信する
async function sendFormRequest(app, path, body) {
  return app.request(path, {
    method: 'POST',
    body: new URLSearchParams(body),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': 'http://localhost:3000',
    },
  });
}

// JSON を含んだリクエストを送信する
async function sendJsonRequest(app, path, body) {
  return app.request(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:3000',
    },
  });
}

describe('/login', () => {
  test('ログインページに GitHub へのリンクが含まれる', async () => {
    const app = require('./app');
    const res = await app.request('/login');
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=UTF-8');
    expect(await res.text()).toMatch(/<a href="\/auth\/github"/);
    expect(res.status).toBe(200);
  });
});

describe('/logout', () => {
  test('ログアウト時に / へリダイレクトされる', async () => {
    const app = require('./app');
    const res = await app.request('/logout');
    expect(res.headers.get('Location')).toBe('/');
    expect(res.status).toBe(302);
  });
});

describe('書籍の登録と表示', () => {
  let bookId = '';

  beforeAll(async () => {
    mockIronSession();
    await prisma.user.upsert({
      where: { userId: testUser.userId },
      create: testUser,
      update: testUser,
    });
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await deleteBookAggregate(bookId);
  });

  test('書籍が登録でき、詳細ページにリダイレクトされる', async () => {
    const app = require('./app');
    const res = await sendFormRequest(app, '/books', {
      title: 'テスト書籍',
      author: 'テスト著者',
      description: 'テスト説明',
    });

    expect(res.status).toBe(302);
    const redirectPath = res.headers.get('Location');
    expect(redirectPath).toMatch(/^\/books\/.+/);
    bookId = redirectPath.split('/books/')[1];
  });

  test('登録した書籍が詳細ページに表示される', async () => {
    const app = require('./app');
    const res = await app.request(`/books/${bookId}`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/テスト書籍/);
    expect(body).toMatch(/テスト著者/);
    expect(body).toMatch(/テスト説明/);
  });

  test('トップページに登録した書籍が表示される', async () => {
    const app = require('./app');
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/テスト書籍/);
  });
});

describe('ステータス・レビュー・削除', () => {
  let bookId = '';
  beforeAll(async () => {
    mockIronSession();
    await prisma.user.upsert({
      where: { userId: testUser.userId },
      create: testUser,
      update: testUser,
    });
    const app = require('./app');
    const res = await sendFormRequest(app, '/books', {
      title: 'ステータステスト書籍',
      author: 'テスト著者',
      description: 'テスト説明',
    });
    bookId = res.headers.get('Location').split('/books/')[1];
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await deleteBookAggregate(bookId);
  });

  test('読書ステータスが更新できる', async () => {
    const app = require('./app');
    const res = await sendJsonRequest(
      app,
      `/statuses/${bookId}/users/${testUser.userId}`,
      { status: 2 } // 読了
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.currentStatus).toBe(2);

    const status = await prisma.readingStatus.findUnique({
      where: { readingStatusCompositeId: `${bookId}_${testUser.userId}` },
    });
    expect(status?.status).toBe(2);
  });

  test('レビューが投稿・更新できる', async () => {
    const app = require('./app');
    const res = await sendJsonRequest(
      app,
      `/reviews/${bookId}/users/${testUser.userId}`,
      { reviewText: '面白かった' }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reviewText).toBe('面白かった');

    const review = await prisma.review.findUnique({
      where: { reviewCompositeId: `${bookId}_${testUser.userId}` },
    });
    expect(review?.reviewText).toBe('面白かった');
  });

  test('書籍が削除できる', async () => {
    const app = require('./app');
    const res = await sendFormRequest(app, `/books/${bookId}/delete`, {});
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/');

    const book = await prisma.book.findUnique({ where: { bookId } });
    expect(book).toBeNull();
  });
});
