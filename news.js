const NEWS_API = window.location.protocol === "file:"
  ? "http://127.0.0.1:8001/api"
  : window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
    ? "/api"
    : "https://api.allunitedfc.com/api";

function articleCard(article) {
  return `
    <article class="news-article">
      <div class="news-tag">${article.tag}</div>
      <h2><a href="news.html?id=${article.slug}">${article.title}</a></h2>
      <div class="news-date">${article.date}</div>
      <p>${article.summary}</p>
    </article>
  `;
}

function articleDetail(article) {
  document.title = `${article.title} | All United FC`;
  return `
    <article class="news-article">
      <div class="news-tag">${article.tag}</div>
      <h2>${article.title}</h2>
      <div class="news-date">${article.date}</div>
      <p>${article.content}</p>
    </article>
  `;
}

document.addEventListener("DOMContentLoaded", async () => {
  const detailList = document.getElementById("news-list");
  const homeList = document.getElementById("home-news-grid");

  try {
    const response = await fetch(`${NEWS_API}/news/`);
    if (!response.ok) throw new Error("News request failed");
    const articles = await response.json();
    const id = new URLSearchParams(window.location.search).get("id");
    const article = articles.find(item => item.slug === id);

    if (detailList) {
      detailList.innerHTML = article
        ? articleDetail(article)
        : articles.map(articleCard).join("");
    }

    if (homeList) {
      homeList.innerHTML = articles.length
        ? articles.slice(0, 3).map(article => `
          <article class="news-card">
            <div class="news-img">${article.tag}</div>
            <div class="news-body">
              <div class="news-tag">${article.tag}</div>
              <h3><a href="news.html?id=${article.slug}">${article.title}</a></h3>
              <p>${article.summary}</p>
              <div class="news-date">${article.date}</div>
            </div>
          </article>
          `).join("")
        : "<p class=\"loading\">No news published yet.</p>";
    }
  } catch (error) {
    const message = "Could not load news. Check that the backend is running.";
    if (detailList) detailList.innerHTML = `<p class="loading">${message}</p>`;
    if (homeList) homeList.innerHTML = `<p class="loading">${message}</p>`;
    console.error(error);
  }
});
