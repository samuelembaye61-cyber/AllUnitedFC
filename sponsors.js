const SPONSOR_API = window.location.protocol === "file:"
  ? "http://127.0.0.1:8001/api"
  : "/api";

const isSponsorPreview = new URLSearchParams(window.location.search).get("preview") === "1";

const previewSponsors = [
  {
    name: "Your Diamond Partner",
    tier: "diamond",
    tier_label: "Diamond",
    bio: "Approved two-sentence company profile goes here. Replace this placeholder before publishing.",
    member_offer: "Member offer to confirm with partner.",
    display_order: 0,
  },
  {
    name: "Your Platinum Partner",
    tier: "platinum",
    tier_label: "Platinum",
    bio: "Short approved partner description goes here.",
    member_offer: "Member offer to confirm with partner.",
    display_order: 0,
  },
  {
    name: "Your Platinum Partner",
    tier: "platinum",
    tier_label: "Platinum",
    bio: "Short approved partner description goes here.",
    member_offer: "Member offer to confirm with partner.",
    display_order: 1,
  },
  {
    name: "Your Gold Partner",
    tier: "gold",
    tier_label: "Gold",
    bio: "Community supporter logo placement.",
    member_offer: "",
    display_order: 0,
  },
  {
    name: "Your Gold Partner",
    tier: "gold",
    tier_label: "Gold",
    bio: "Community supporter logo placement.",
    member_offer: "",
    display_order: 1,
  },
  {
    name: "Your Gold Partner",
    tier: "gold",
    tier_label: "Gold",
    bio: "Community supporter logo placement.",
    member_offer: "",
    display_order: 2,
  },
];

function createSponsorCard(sponsor, tier, preview = false) {
  const card = document.createElement("article");
  card.className = `sponsor-card sponsor-card-${tier}`;

  const logoFrame = document.createElement(sponsor.website ? "a" : "div");
  logoFrame.className = "sponsor-logo-frame";
  if (sponsor.website) {
    logoFrame.href = sponsor.website;
    logoFrame.target = "_blank";
    logoFrame.rel = "noopener noreferrer";
    logoFrame.setAttribute("aria-label", `Visit ${sponsor.name}`);
  }

  if (sponsor.logo) {
    const logo = document.createElement("img");
    logo.src = sponsor.logo;
    logo.alt = `${sponsor.name} logo`;
    logo.loading = "lazy";
    logo.decoding = "async";
    logoFrame.append(logo);
  } else {
    const logoPlaceholder = document.createElement("span");
    logoPlaceholder.className = "sponsor-logo-placeholder";
    logoPlaceholder.textContent = `${sponsor.tier_label || tier} partner logo`;
    logoFrame.append(logoPlaceholder);
  }

  const body = document.createElement("div");
  body.className = "sponsor-card-body";

  if (preview) {
    const badge = document.createElement("span");
    badge.className = "sponsor-demo-badge";
    badge.textContent = "Preview";
    body.append(badge);
  }

  const heading = document.createElement("h3");
  heading.textContent = sponsor.name;
  body.append(heading);

  if (sponsor.bio) {
    const bio = document.createElement("p");
    bio.textContent = sponsor.bio;
    body.append(bio);
  }

  if (sponsor.member_offer) {
    const offer = document.createElement("p");
    offer.className = "sponsor-member-offer";
    offer.textContent = sponsor.member_offer;
    body.append(offer);
  }

  card.append(logoFrame, body);
  return card;
}

function renderSponsorGroup(containerId, sponsors, tier, preview = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.replaceChildren();
  if (!sponsors.length) {
    const empty = document.createElement("p");
    empty.className = "sponsor-empty-state";
    empty.textContent = "Partner listings will appear here once confirmed.";
    container.append(empty);
    return;
  }

  sponsors.forEach(sponsor => container.append(createSponsorCard(sponsor, tier, preview)));
}

function renderFooterSponsorRibbon(sponsors) {
  const ribbon = document.getElementById("footer-sponsors");
  if (!ribbon) return;

  const visibleSponsors = sponsors.filter(sponsor => sponsor.logo);
  if (!visibleSponsors.length) {
    ribbon.hidden = true;
    return;
  }

  ribbon.replaceChildren();
  visibleSponsors.forEach(sponsor => {
    const logo = document.createElement("img");
    logo.src = sponsor.logo;
    logo.alt = `${sponsor.name} logo`;
    logo.loading = "lazy";
    logo.decoding = "async";
    if (sponsor.website) {
      const link = document.createElement("a");
      link.href = sponsor.website;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", `Visit ${sponsor.name}`);
      link.append(logo);
      ribbon.append(link);
    } else {
      ribbon.append(logo);
    }
  });
  ribbon.hidden = false;
}

async function loadSponsors() {
  const previewNotice = document.getElementById("sponsor-preview-notice");
  if (previewNotice) previewNotice.hidden = !isSponsorPreview;

  let sponsors = previewSponsors;
  if (!isSponsorPreview) {
    try {
      const response = await fetch(`${SPONSOR_API}/sponsors/`);
      if (!response.ok) throw new Error("Sponsor request failed");
      sponsors = await response.json();
    } catch (error) {
      console.error(error);
      sponsors = [];
    }
  }

  for (const tier of ["diamond", "platinum", "gold"]) {
    renderSponsorGroup(
      `${tier}-sponsors`,
      sponsors.filter(sponsor => sponsor.tier === tier),
      tier,
      isSponsorPreview,
    );
  }

  renderFooterSponsorRibbon(sponsors);
}

async function submitSponsorInquiry(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const feedback = document.getElementById("sponsor-form-feedback");
  const submit = form.querySelector("button[type='submit']");

  if (isSponsorPreview) {
    feedback.textContent = "Preview only: no inquiry was sent or saved.";
    return;
  }

  const values = new FormData(form);
  if (values.get("website_url")) return;

  submit.disabled = true;
  feedback.textContent = "Sending inquiry...";

  try {
    const csrfResponse = await fetch(`${SPONSOR_API}/csrf/`, { credentials: "same-origin" });
    if (!csrfResponse.ok) throw new Error("Could not start a secure submission.");
    const csrf = await csrfResponse.json();

    const response = await fetch(`${SPONSOR_API}/sponsor-inquiries/`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrf.csrfToken,
      },
      body: JSON.stringify({
        business_name: values.get("business_name"),
        contact_name: values.get("contact_name"),
        email: values.get("email"),
        phone: values.get("phone"),
        intended_tier: values.get("intended_tier"),
        message: values.get("message"),
        website_url: values.get("website_url"),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not send your inquiry.");

    form.reset();
    feedback.textContent = "Thank you. Your inquiry has been received.";
  } catch (error) {
    feedback.textContent = error.message || "Could not send your inquiry. Please try again.";
  } finally {
    submit.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadSponsors();
  const form = document.getElementById("sponsor-inquiry-form");
  if (form) form.addEventListener("submit", submitSponsorInquiry);

  const printButton = document.getElementById("print-sponsor-flyer");
  if (printButton) printButton.addEventListener("click", () => window.print());
});