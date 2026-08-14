'use strict';

const { html } = require('hono/html');

function layout(c, title, content) {
  const session = c.get('session');
  const user = session?.user;

  return html`
    <!DOCTYPE html>
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title} - TechBookHub</title>
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/stylesheets/bundle.css" />
      </head>
      <body>
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
          <div class="container">
            <a class="navbar-brand" href="/">TechBookHub</a>
            <div class="d-flex align-items-center">
              ${user
                ? html`
                    <span class="text-light me-3">${user.login} としてログイン中</span>
                    <a href="/logout" class="btn btn-outline-light btn-sm">ログアウト</a>
                  `
                : html`
                    <a href="/login" class="btn btn-primary btn-sm">GitHubでログイン</a>
                  `}
            </div>
          </div>
        </nav>
        <div class="container">${content}</div>
        <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
        <script src="/javascripts/bundle.js"></script>
      </body>
    </html>
  `;
}

module.exports = layout;