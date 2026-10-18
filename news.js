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

  return `<img class="news-image" src="${article.image}" alt="${article.title}" loading="lazy" decoding="async">`;
}

function articleContext(article) {
  const details = [];

  if (article.related_match) {
    const match = article.related_match;
    const hasScore = match.home_score !== null && match.away_score !== null;
    const score = hasScore ? ` · ${match.home_score}-${match.away_score}` : "";
    details.push(`<span>Match: ${match.home_team} vs. ${match.away_team}${score}</span>`);
  }

  if (article.related_player) {
    const player = article.related_player;
    details.push(`<span>Player: #${player.number} ${player.name}${player.position ? ` · ${player.position}` : ""}</span>`);
  }

  return details.length ? `<div class="news-article-context">${details.join("")}</div>` : "";
}

function articleCard(article) {
  return `
    <article class="news-card" data-article-type="${article.article_type || "general"}" data-priority-tier="${article.priority_tier || 3}">
      <div class="news-image-wrap">
        ${articleImage(article)}
      </div>
      <div class="news-body">
        <div class="news-category">${article.article_type_label || "General news"}</div>
        <div class="news-tag">${article.tag}</div>
        <h3><a href="news.html?id=${article.slug}">${article.title}</a></h3>
        ${articleContext(article)}
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
      <img class="media-gallery-image" src="${image}" alt="${article.title}" loading="lazy" decoding="async">
    </a>
  `;
}

function videoEmbedUrl(videoUrl) {
  try {
    const url = new URL(videoUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "youtu.be" || host === "youtube.com" || host === "m.youtube.com") {
      const segments = url.pathname.split("/").filter(Boolean);
      const videoId = host === "youtu.be"
        ? segments[0]
        : url.searchParams.get("v") || (segments[0] === "embed" || segments[0] === "shorts" ? segments[1] : "");
      return /^[a-zA-Z0-9_-]{11}$/.test(videoId || "")
        ? `https://www.youtube-nocookie.com/embed/${videoId}`
        : "";
    }

    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const videoId = url.pathname.split("/").filter(Boolean).find(segment => /^\d+$/.test(segment));
      return videoId ? `https://player.vimeo.com/video/${videoId}` : "";
    }
  } catch (error) {
    return "";
  }

  return "";
}

function mediaVideoCard(article) {
  const embedUrl = videoEmbedUrl(article.video_url);

  return `
    <article class="media-video-item">
      <div class="media-video-frame">
        ${embedUrl
          ? `<iframe src="${embedUrl}" title="${article.title}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`
          : `<a href="${article.video_url}" target="_blank" rel="noopener noreferrer">Watch ${article.title}</a>`}
      </div>
      <h4>${article.title}</h4>
    </article>
  `;
}

function archivePage(articles) {
  const tierOneArticles = articles.filter(article => article.priority_tier === 1);
  const tierTwoArticles = articles.filter(article => article.priority_tier === 2);
  const tierThreeArticles = articles.filter(article => article.priority_tier === 3);
  const articleTypes = [...new Map(
    tierThreeArticles.map(article => [
      article.article_type || "general",
      article.article_type_label || "General news"
    ])
  )];
  const categoryOptions = articleTypes
    .map(([value, label]) => `<button class="news-filter-pill" type="button" data-category="${value}" aria-pressed="false">${label}</button>`)
    .join("");
  const featuredHeadline = tierTwoArticles[0];
  const headlineImage = featuredHeadline && (featuredHeadline.image || (featuredHeadline.gallery && featuredHeadline.gallery[0] ? featuredHeadline.gallery[0].image : ""));
  const headlineButton = featuredHeadline && (featuredHeadline.article_type === "match_report" || featuredHeadline.related_match ? "Read Match Recap" : "Read Story");
  const headlineArchive = tierTwoArticles.slice(1).map(articleCard).join("");
  const tierOneArchive = tierOneArticles.map(articleCard).join("");
  const mediaItems = articles
    .flatMap(article => {
      const images = [article.image, ...(article.gallery || []).map(item => item.image)]
        .filter(Boolean);
      return [...new Set(images)].map(image => mediaGalleryCard(article, image));
    })
    .join("");
  const videoItems = articles.filter(article => article.video_url).map(mediaVideoCard).join("");
  const articleList = tierThreeArticles.map(articleCard).join("");

  return `
    ${featuredHeadline ? `
      <section class="news-headline-section">
        <div class="section-label">Headline story</div>
        <article class="news-featured-block tier-two-feature">
          <img class="news-featured-image" src="${headlineImage || 'images/PHOTO.jpg'}" alt="${featuredHeadline.title}" fetchpriority="high">
          <div class="news-featured-copy">
            <div class="news-category">${featuredHeadline.article_type_label || "Headline story"}</div>
            <div class="news-tag">${featuredHeadline.tag}</div>
            <h2>${featuredHeadline.title}</h2>
            <p>${featuredHeadline.summary}</p>
            <a class="btn" href="news.html?id=${featuredHeadline.slug}">${headlineButton}</a>
          </div>
        </article>
        ${headlineArchive ? `<div class="news-page-list archive-list headline-archive-list">${headlineArchive}</div>` : ""}
      </section>
    ` : ""}

    ${tierOneArchive ? `
      <section class="news-alert-archive">
        <div class="section-label">Club alerts</div>
        <h3 class="news-section-title">Urgent notices</h3>
        <div class="news-page-list archive-list">${tierOneArchive}</div>
      </section>
    ` : ""}

    <div class="news-content-columns">
      <section class="news-archive-section">
        <div class="section-label">News</div>
        <h3 class="news-section-title">Latest stories</h3>
        <div class="news-filter-bar">
          <div class="news-filter-pills" role="group" aria-label="Filter stories by category" aria-controls="news-article-list">
            <button class="news-filter-pill" type="button" data-category="all" aria-pressed="true">All categories</button>
            ${categoryOptions}
          </div>
          <span id="news-filter-count" aria-live="polite"></span>
        </div>
        <div id="news-article-list" class="news-page-list archive-list">
          <div id="news-filter-empty" class="loading" hidden>No stories match this category.</div>
          ${articleList || '<p class="loading">No stories published yet.</p>'}
        </div>
      </section>

      <section class="news-media-section">
        <div class="section-label">Media &amp; photos</div>
        <h3 class="news-section-title">All media</h3>
        <div class="media-gallery">
          ${mediaItems || '<p class="loading">No media available yet.</p>'}
        </div>
        ${videoItems ? `<div class="media-video-section"><h3 class="news-section-title">Video highlights</h3><div class="media-video-grid">${videoItems}</div></div>` : ""}
      </section>
    </div>
  `;
}

function setupNewsCategoryFilter() {
  const articleList = document.getElementById("news-article-list");
  const filterButtons = [...document.querySelectorAll(".news-filter-pill")];
  const count = document.getElementById("news-filter-count");
  const emptyMessage = document.getElementById("news-filter-empty");

  if (!filterButtons.length || !articleList) return;

  const cards = [...articleList.querySelectorAll(".news-card")];
  const updateArticles = selectedType => {
    let visibleCount = 0;

    cards.forEach(card => {
      const isVisible = selectedType === "all" || card.dataset.articleType === selectedType;
      card.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });

    if (count) {
      count.textContent = `${visibleCount} ${visibleCount === 1 ? "story" : "stories"}`;
    }
    if (emptyMessage) emptyMessage.hidden = visibleCount > 0;
  };

  filterButtons.forEach(button => {
    button.addEventListener("click", () => {
      filterButtons.forEach(filterButton => {
        filterButton.setAttribute("aria-pressed", String(filterButton === button));
      });
      updateArticles(button.dataset.category);
    });
  });
  updateArticles("all");
}

function featuredHighlightCard(article) {
  const image = article.image || (article.gallery && article.gallery[0] ? article.gallery[0].image : "");
  const buttonLabel = article.article_type === "match_report" || article.related_match ? "Read Match Recap" : "Read Story";

  return `
    <a class="highlight-featured-link" href="news.html?id=${article.slug}">
      <img class="highlight-featured-image" src="${image || 'images/PHOTO.jpg'}" alt="${article.title}" fetchpriority="high">
      <div class="highlight-featured-content">
        <div class="news-tag">${article.tag}</div>
        <h3>${article.title}</h3>
        <p>${article.summary}</p>
        <span class="highlight-link">${buttonLabel}</span>
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
      <div class="news-category">${article.article_type_label || "General news"}</div>
      <div class="news-tag">${article.tag}</div>
      <h2>${article.title}</h2>
      ${articleContext(article)}
      <div class="news-date">${formatUsDate(article.date)}</div>
      ${article.image ? `<img class="news-detail-image" src="${article.image}" alt="${article.title}">` : ""}
      <p>${article.content}</p>
      ${article.video_url ? `<a class="news-video-link" href="${article.video_url}" target="_blank" rel="noopener noreferrer">Watch video</a>` : ""}
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

function randomHighlightIndex(articleCount, previousIndex = -1) {
  if (articleCount <= 1) return 0;

  const choices = Array.from({ length: articleCount }, (_, index) => index)
    .filter(index => index !== previousIndex);
  return choices[Math.floor(Math.random() * choices.length)];
}

function renderUrgentAlert(articles) {
  const banner = document.getElementById("urgent-alert");
  if (!banner) return;

  const now = Date.now();
  const alertArticle = articles.find(article => {
    if (article.priority_tier !== 1 || !article.alert_ends_at) return false;
    const startsAt = article.alert_starts_at ? Date.parse(article.alert_starts_at) : -Infinity;
    const endsAt = Date.parse(article.alert_ends_at);
    return startsAt <= now && endsAt > now;
  });

  if (!alertArticle) {
    banner.hidden = true;
    document.documentElement.style.setProperty("--urgent-alert-height", "0px");
    return;
  }

  const link = document.createElement("a");
  link.href = `news.html?id=${encodeURIComponent(alertArticle.slug)}`;

  const label = document.createElement("strong");
  label.textContent = "Urgent club alert";
  const title = document.createElement("span");
  title.textContent = alertArticle.title;
  const summary = document.createElement("span");
  summary.textContent = alertArticle.summary;
  link.append(label, title, summary);

  banner.replaceChildren(link);
  banner.hidden = false;

  const updateHeaderOffset = () => {
    document.documentElement.style.setProperty("--urgent-alert-height", `${banner.offsetHeight}px`);
  };
  updateHeaderOffset();
  window.addEventListener("resize", updateHeaderOffset);
}

document.addEventListener("DOMContentLoaded", async () => {
  const detailList = document.getElementById("news-list");
  const featuredHighlight = document.getElementById("featured-highlight");
  const highlightGrid = document.getElementById("highlight-grid");

  try {
    const response = await fetch(`${NEWS_API}/news/`);
    if (!response.ok) throw new Error("News request failed");

    const articles = await response.json();
    renderUrgentAlert(articles);
    const id = new URLSearchParams(window.location.search).get("id");
    const article = articles.find(item => item.slug === id);
    const backLink = document.querySelector(".back-link");

    if (article && backLink) {
      backLink.href = "news.html";
      backLink.innerHTML = "&larr; Back to News";
    }

    if (detailList) {
      detailList.classList.toggle("news-archive-list", !article);
      detailList.innerHTML = article
        ? articleDetail(article)
        : archivePage(articles);
      if (!article) setupNewsCategoryFilter();
    }

    if (featuredHighlight && highlightGrid) {
      if (!articles.length) {
        featuredHighlight.innerHTML = "<p class=\"loading\">No highlights available yet.</p>";
        highlightGrid.innerHTML = "<p class=\"loading\">No additional highlights yet.</p>";
      } else {
        const headlineArticles = articles.filter(article => article.priority_tier === 2);
        const standardArticles = articles.filter(article => article.priority_tier === 3);
        const highlightArticles = headlineArticles.length ? headlineArticles : standardArticles;

        if (!highlightArticles.length) {
          featuredHighlight.innerHTML = "<p class=\"loading\">No headline stories available yet.</p>";
          highlightGrid.innerHTML = "<p class=\"loading\">No additional highlights yet.</p>";
          return;
        }

        let activeIndex = randomHighlightIndex(highlightArticles.length);
        renderHighlightSet(highlightArticles, activeIndex);

        if (highlightArticles.length > 1) {
          setInterval(() => {
            activeIndex = randomHighlightIndex(highlightArticles.length, activeIndex);
            renderHighlightSet(highlightArticles, activeIndex);
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
