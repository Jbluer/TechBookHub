import $ from 'jquery';

// 読書ステータス切り替え（非同期）
$('.status-btn').on('click', function () {
  const btn = $(this);
  const bookId = btn.data('book-id');
  const userId = btn.data('user-id');
  const status = btn.data('status');

  fetch(`/statuses/${bookId}/users/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.status === 'OK') {
        $('.status-btn').removeClass('btn-primary').addClass('btn-outline-primary');
        btn.removeClass('btn-outline-primary').addClass('btn-primary');
      }
    });
});

// レビュー投稿・更新（非同期）
$('#self-review-btn').on('click', function () {
  const btn = $(this);
  const bookId = btn.data('book-id');
  const userId = btn.data('user-id');

  const reviewText = prompt('レビュー・感想を入力してください：');
  if (reviewText !== null && reviewText.trim() !== '') {
    fetch(`/reviews/${bookId}/users/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewText }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'OK') {
          $('#self-review').text(data.reviewText);
        }
      });
  }
});