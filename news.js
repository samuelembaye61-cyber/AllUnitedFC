const NEWS_API = window.location.protocol === "file:"
  ? "http://127.0.0.1:8001/api"
  : "/api";

function formatUsDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString + "T12:00:00");
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function articleImage(article) {
  if (!article.image) {
    return `<div class="news-placeholder">Club News</div>`;
  }

  return `<img class="news-image" src="${article.image}" alt="${article.title}">`;
}

function articleCard(article) {
  return `
    <article class="news-card">
      <div class="news-image-wrap">
        ${articleImage(article)}
      </div>
      <div class="news-body">
        <div class="news-tag">${article.tag}</div>
        <h3><a href="news.html?id=${article.slug}">${article.title}</a></h3>
        <p>${article.summary}</p>
        <div class="news-meta">
          <span class="news-date">${formatUsDate(article.date)}</span>
          <a class="news-read-more" href="news.html?id=${article.slug}">Read more</a>
        </div>
      </div>
    </article>
  `;
}

function mediaGalleryCard(article, image) {
  return `
    <a class="media-gallery-item" href="news.html?id=${article.slug}" aria-label="View photos from ${article.title}">
      <img class="media-gallery-image" src="${image}" alt="${article.title}">
    </a>
  `;
}

function archivePage(articles) {
  const mediaItems = articles
    .flatMap(article => {
      const images = [article.image, ...(article.gallery || []).map(item => item.image)]
        .filter(Boolean);
      return [...new Set(images)].map(image => mediaGalleryCard(article, image));
    })
    .join("");
  const articleList = articles.map(articleCard).join("");

  return `
    <section class="news-archive-section">
      <div class="section-label">News</div>
      <h3 class="news-section-title">Latest stories</h3>
      <div class="news-page-list archive-list">
        ${articleList || '<p class="loading">No stories published yet.</p>'}
      </div>
    </section>

    <section class="news-media-section">
      <div class="section-label">Media</div>
      <h3 class="news-section-title">All media</h3>
      <div class="media-gallery">
        ${mediaItems || '<p class="loading">No media available yet.</p>'}
      </div>
    </section>
  `;
}

function featuredHighlightCard(article) {
  const image = article.image || (article.gallery && article.gallery[0] ? article.gallery[0].image : "");

  return `
    <a class="highlight-featured-link" href="news.html?id=${article.slug}">
      <div class="highlight-featured-image" style="background-image: url('${image || 'images/PHOTO.jpg'}');"></div>
      <div class="highlight-featured-content">
        <div class="news-tag">${article.tag}</div>
        <h3>${article.title}</h3>
        <p>${article.summary}</p>
        <span class="highlight-link">Read more</span>
      </div>
    </a>
  `;
}

function highlightCard(article) {
  const image = article.image || (article.gallery && article.gallery[0] ? article.gallery[0].image : "");

  return `
    <a class="highlight-card" href="news.html?id=${article.slug}">
      <div class="highlight-card-image" style="background-image: url('${image || 'images/PHOTO.jpg'}');"></div>
      <div class="highlight-card-body">
        <div class="news-tag">${article.tag}</div>
        <h4>${article.title}</h4>
      </div>
    </a>
  `;
}

function articleDetail(article) {
  document.title = `${article.title} | All United FC`;

  const gallery = (article.gallery || [])
    .map(item => `
      <figure class="news-gallery-item">
        <img class="news-gallery-image" src="${item.image}" alt="${item.caption || article.title}">
        ${item.caption ? `<figcaption>${item.caption}</figcaption>` : ""}
      </figure>
    `)
    .join("");

  return `
    <article class="news-article">
      <div class="news-tag">${article.tag}</div>
      <h2>${article.title}</h2>
      <div class="news-date">${formatUsDate(article.date)}</div>
      ${article.image ? `<img class="news-detail-image" src="${article.image}" alt="${article.title}">` : ""}
      <p>${article.content}</p>
      ${gallery ? `<div class="news-gallery">${gallery}</div>` : ""}
    </article>
  `;
}

function renderHighlightSet(articles, startIndex = 0) {
  const featuredHighlight = document.getElementById("featured-highlight");
  const highlightGrid = document.getElementById("highlight-grid");
  const highlightLayout = document.querySelector(".highlights-layout");
  const highlightDots = document.getElementById("highlight-dots");

  if (!featuredHighlight || !highlightGrid || !articles.length) {
    return;
  }

  const featuredArticle = articles[startIndex % articles.length];
  const secondaryArticles = articles.filter((_, index) => index !== startIndex).slice(0, 3);

  featuredHighlight.innerHTML = featuredHighlightCard(featuredArticle);

  if (highlightLayout) {
    highlightLayout.classList.add("single-highlight");
  }

  highlightGrid.style.display = "none";

  if (secondaryArticles.length) {
    highlightGrid.innerHTML = secondaryArticles.map(highlightCard).join("");
  } else {
    highlightGrid.innerHTML = "<p class=\"loading\">No additional highlights yet.</p>";
  }

  if (highlightDots) {
    highlightDots.innerHTML = articles
      .map((_, index) => `<span class="highlight-dot ${index === startIndex ? "active" : ""}" aria-label="Show article ${index + 1}"></span>`)
      .join("");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const detailList = document.getElementById("news-list");
  const featuredHighlight = document.getElementById("featured-highlight");
  const highlightGrid = document.getElementById("highlight-grid");

  try {
    const response = await fetch(`${NEWS_API}/news/`);
    if (!response.ok) throw new Error("News request failed");

    const articles = await response.json();
    const id = new URLSearchParams(window.location.search).get("id");
    const article = articles.find(item => item.slug === id);

    if (detailList) {
      detailList.innerHTML = article
        ? articleDetail(article)
        : archivePage(articles);
    }

    if (featuredHighlight && highlightGrid) {
      if (!articles.length) {
        featuredHighlight.innerHTML = "<p class=\"loading\">No highlights available yet.</p>";
        highlightGrid.innerHTML = "<p class=\"loading\">No additional highlights yet.</p>";
      } else {
        let activeIndex = 0;
        renderHighlightSet(articles, activeIndex);

        if (articles.length > 1) {
          setInterval(() => {
            activeIndex = (activeIndex + 1) % articles.length;
            renderHighlightSet(articles, activeIndex);
          }, 10000);
        }
      }
    }
  } catch (error) {
    const message = "Could not load news. Check that the backend is running.";
    if (detailList) detailList.innerHTML = `<p class="loading">${message}</p>`;
    if (featuredHighlight) featuredHighlight.innerHTML = `<p class="loading">${message}</p>`;
    if (highlightGrid) highlightGrid.innerHTML = `<p class="loading">${message}</p>`;
    console.error(error);
  }
});
