const contentPath = "content/site.json";
const projectDetailRecords = new Map();
let lastModalOpener = null;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeUrl(value = "") {
  const url = String(value).trim();
  if (!url) return "";
  if (/^(https?:|mailto:)/i.test(url)) return url;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(url)) return `https://${url}`;
  return "";
}

function safeAssetPath(value = "") {
  const path = String(value).trim();
  return path.startsWith("/") && !path.startsWith("//") ? path : "";
}

function actionLink(url, label, className) {
  const destination = safeUrl(url);
  const draftAttribute = destination ? "" : " data-draft-link";
  const href = destination || "#";
  const externalAttributes = destination.startsWith("http")
    ? ' target="_blank" rel="noreferrer"'
    : "";

  return `<a class="${className}" href="${escapeHtml(href)}"${externalAttributes}${draftAttribute}>${escapeHtml(label)} <span aria-hidden="true">${destination ? "↗" : "→"}</span></a>`;
}

function detailsButton(projectId, label, className) {
  return `<button class="${className}" type="button" data-project-details="${escapeHtml(projectId)}">${escapeHtml(label || "Details")} <span aria-hidden="true">→</span></button>`;
}

function projectVisual(project) {
  const preview = safeUrl(project.preview) || (String(project.preview || "").startsWith("/") ? project.preview : "");
  if (preview) {
    return `
      <div class="project-visual project-uploaded-visual">
        <img class="project-preview-image" src="${escapeHtml(preview)}" alt="${escapeHtml(project.previewAlt || `Preview for ${project.title}`)}">
      </div>`;
  }

  const allowedVisuals = ["visual-chart", "visual-board", "visual-field"];
  const visual = allowedVisuals.includes(project.visual) ? project.visual : "visual-chart";
  return `
    <div class="project-visual ${visual}" role="img" aria-label="${escapeHtml(project.previewAlt || `Preview graphic for ${project.title}`)}">
      <span class="visual-label">${escapeHtml(project.visualLabel)}</span>
    </div>`;
}

function renderContent(content) {
  document.title = content.pageTitle;
  document.querySelector('meta[name="description"]').setAttribute("content", content.metaDescription);
  document.querySelector("#logoInitials").textContent = content.initials;
  document.querySelector("#siteName").textContent = content.siteName;
  document.querySelector(".logo").setAttribute("aria-label", `${content.siteName}, home`);
  document.querySelector("#introText").textContent = content.intro;
  document.querySelector("#summaryText").textContent = content.summary;
  document.querySelector("#primaryCta").textContent = content.primaryCta;

  document.querySelectorAll("[data-label]").forEach((element) => {
    element.textContent = content.labels[element.dataset.label];
  });
  document.querySelector("#projects-title").textContent = content.labels.projects;
  document.querySelector("#moreProjectsLabel").textContent = content.labels.moreProjects;
  document.querySelector("#experience-title").textContent = content.labels.experience;
  document.querySelector("#skills-title").textContent = content.labels.skills;
  document.querySelector("#contact-title").textContent = content.labels.contact;

  const featured = content.featured;
  projectDetailRecords.clear();
  projectDetailRecords.set("featured", featured);
  const featuredProject = document.querySelector("#featuredProject");
  featuredProject.dataset.projectCard = "featured";
  featuredProject.innerHTML = `
    <div class="featured-media" aria-label="${escapeHtml(featured.title)} application preview">
      <img class="featured-gif" src="${escapeHtml(featured.preview)}" alt="${escapeHtml(featured.previewAlt)}">
    </div>
    <div class="featured-copy">
      <div>
        <h2 id="featured-title">${escapeHtml(featured.title)}</h2>
        <p class="project-summary">${escapeHtml(featured.description)}</p>
      </div>
      <ul class="feature-list">
        ${featured.points.map((point, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span>${escapeHtml(point)}</li>`).join("")}
      </ul>
      <div class="project-actions">
        ${actionLink(featured.siteUrl, featured.siteLabel, "button button-dark")}
        ${detailsButton("featured", featured.detailsLabel, "button button-quiet")}
      </div>
    </div>`;

  document.querySelector("#projectGrid").innerHTML = content.projects.map((project, index) => {
    const projectId = `project-${index}`;
    projectDetailRecords.set(projectId, project);
    return `
      <article class="project-card reveal" data-project-card="${projectId}">
        ${projectVisual(project)}
        <div class="project-card-body">
          <div class="project-card-heading">
            <p class="project-type">${escapeHtml(project.type)}</p>
            ${detailsButton(projectId, project.detailsLabel, "button button-quiet project-details-button")}
          </div>
          <h3>${escapeHtml(project.title)}</h3>
          <p class="project-description">${escapeHtml(project.description)}</p>
        </div>
      </article>`;
  }).join("");

  const experienceEntry = (item, index, groupKey) => {
    const panelId = `${groupKey}-entry-${index}`;
    return `
      <article class="experience-item${item.highlight ? " is-highlighted" : ""}">
        <button class="experience-toggle" type="button" aria-expanded="false" aria-controls="${panelId}">
          <span class="experience-identity">
            <span class="experience-company-line">
              <strong>${escapeHtml(item.organization)}</strong>
              <span class="experience-chevron" aria-hidden="true"></span>
            </span>
            <span class="experience-role">${escapeHtml(item.role)}</span>
          </span>
          <span class="experience-date">${escapeHtml(item.date)}</span>
        </button>
        <div class="experience-details" id="${panelId}" hidden>
          <p>${escapeHtml(item.description)}</p>
        </div>
      </article>`;
  };
  const experienceGroups = [
    { key: "experience", label: "Experience" },
    { key: "education", label: "Education" },
  ];
  document.querySelector("#experienceList").innerHTML = experienceGroups.map((group) => {
    const entries = content.experience.filter((item) => {
      const section = item.section || (item.tag?.toLowerCase() === "education" ? "education" : "experience");
      return section === group.key;
    });
    return `
      <section class="experience-group" aria-labelledby="${group.key}-subheading">
        <h3 class="experience-subheading" id="${group.key}-subheading">${group.label}</h3>
        <div class="timeline">${entries.map((item, index) => experienceEntry(item, index, group.key)).join("")}</div>
      </section>`;
  }).join("");

  document.querySelector("#skillsList").innerHTML = content.skills.map((group) => `
    <article>
      <p class="mono-label">${escapeHtml(group.category)}</p>
      <p>${escapeHtml(group.items)}</p>
    </article>`).join("");

  document.querySelector("#contactLinks").innerHTML = content.contactLinks.map((link) => {
    const destination = safeAssetPath(link.file) || safeUrl(link.url);
    const externalAttributes = destination.startsWith("http") ? ' target="_blank" rel="noreferrer"' : "";
    const draftAttribute = destination ? "" : " data-draft-link";
    return `<a href="${escapeHtml(destination || "#")}"${externalAttributes}${draftAttribute}><span>${escapeHtml(link.label)}</span><strong>${escapeHtml(link.title)}</strong><b>↗</b></a>`;
  }).join("");

  document.querySelector("#footerName").textContent = content.footerName;
}

function setupNavigation() {
  const menuButton = document.querySelector(".menu-button");
  const navLinks = document.querySelector("#navLinks");
  const visibleScrollTarget = (target) => target.matches(".section-shell")
    ? target.querySelector(".section-label") || target
    : target;
  menuButton.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });
  navLinks.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    const targetId = link.getAttribute("href").slice(1);
    if (!targetId || link.hasAttribute("data-draft-link")) return;
    link.addEventListener("click", (event) => {
      const target = document.getElementById(targetId);
      if (!target) return;
      event.preventDefault();
      visibleScrollTarget(target).scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    });
  });

  if (window.location.hash) {
    const initialTarget = document.querySelector(window.location.hash);
    if (initialTarget) {
      requestAnimationFrame(() => {
        visibleScrollTarget(initialTarget).scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      });
    }
  }
}

function setupProjectToggle() {
  const toggle = document.querySelector(".subsection-toggle");
  const projectGrid = document.querySelector("#projectGrid");
  let collapseTimer;

  if (toggle.getAttribute("aria-expanded") === "true") {
    projectGrid.hidden = false;
    projectGrid.classList.add("is-open");
    projectGrid.style.maxHeight = `${projectGrid.scrollHeight}px`;
  }

  toggle.addEventListener("click", () => {
    const isExpanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isExpanded));
    window.clearTimeout(collapseTimer);

    if (isExpanded) {
      projectGrid.style.maxHeight = `${projectGrid.scrollHeight}px`;
      projectGrid.offsetHeight;
      projectGrid.classList.remove("is-open");
      projectGrid.style.maxHeight = "0px";
      collapseTimer = window.setTimeout(() => {
        projectGrid.hidden = true;
      }, 440);
      return;
    }

    projectGrid.hidden = false;
    projectGrid.style.maxHeight = "0px";
    requestAnimationFrame(() => {
      projectGrid.classList.add("is-open");
      projectGrid.style.maxHeight = `${projectGrid.scrollHeight}px`;
    });
  });

  window.addEventListener("resize", () => {
    if (toggle.getAttribute("aria-expanded") === "true") {
      projectGrid.style.maxHeight = `${projectGrid.scrollHeight}px`;
    }
  });
}

function setupProjectModal() {
  const modal = document.querySelector("#projectModal");
  const dialog = modal.querySelector(".project-modal-dialog");
  const title = modal.querySelector("#modalProjectTitle");
  const description = modal.querySelector("#modalProjectDescription");
  const projectLink = modal.querySelector("#modalProjectLink");
  const featurePanel = modal.querySelector("#featurePanel");
  const codePanel = modal.querySelector("#codePanel");
  const tabButtons = [...modal.querySelectorAll("[data-detail-tab]")];
  const closeButton = modal.querySelector(".project-modal-close");

  function selectTab(tabName) {
    tabButtons.forEach((button) => {
      const isSelected = button.dataset.detailTab === tabName;
      button.setAttribute("aria-selected", String(isSelected));
      button.tabIndex = isSelected ? 0 : -1;
    });
    featurePanel.hidden = tabName !== "feature";
    codePanel.hidden = tabName !== "code";
  }

  function closeModal() {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    lastModalOpener?.focus();
  }

  function openProjectModal(projectId, opener) {
    const project = projectDetailRecords.get(projectId);
    if (!project) return;
    lastModalOpener = opener;
    title.textContent = project.title;
    description.textContent = project.description;
    const projectDestination = safeUrl(project.projectLinkUrl);
    projectLink.hidden = !projectDestination;
    projectLink.href = projectDestination || "#";
    projectLink.innerHTML = `${escapeHtml(project.projectLinkLabel || "Visit project")} <span aria-hidden="true">↗</span>`;
    featurePanel.textContent = project.featureDecisions?.trim() || "Add your feature-decision write-up in the portfolio editor.";
    codePanel.textContent = project.codeDetails?.trim() || "Add your technical implementation write-up in the portfolio editor.";
    selectTab("feature");
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => closeButton.focus());
  }

  document.querySelectorAll("[data-project-details]").forEach((button) => {
    button.addEventListener("click", () => openProjectModal(button.dataset.projectDetails, button));
  });

  document.querySelectorAll("[data-project-card]").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest("a, button")) return;
      const focusTarget = card.querySelector("[data-project-details]");
      openProjectModal(card.dataset.projectCard, focusTarget);
    });
  });

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => selectTab(button.dataset.detailTab));
  });
  modal.querySelectorAll("[data-modal-close]").forEach((button) => button.addEventListener("click", closeModal));
  dialog.addEventListener("click", (event) => event.stopPropagation());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });
}

function setupExperienceAccordions() {
  const toggles = [...document.querySelectorAll(".experience-toggle")];
  const panelTimers = new WeakMap();

  function closeEntry(button) {
    const panel = document.getElementById(button.getAttribute("aria-controls"));
    if (button.getAttribute("aria-expanded") !== "true") return;
    button.setAttribute("aria-expanded", "false");
    panel.style.maxHeight = `${panel.scrollHeight}px`;
    panel.offsetHeight;
    panel.classList.remove("is-open");
    panel.style.maxHeight = "0px";
    const timer = window.setTimeout(() => { panel.hidden = true; }, 320);
    panelTimers.set(panel, timer);
  }

  toggles.forEach((button) => {
    button.addEventListener("click", () => {
      const isExpanded = button.getAttribute("aria-expanded") === "true";
      if (isExpanded) {
        closeEntry(button);
        return;
      }

      toggles.forEach((otherButton) => closeEntry(otherButton));
      const panel = document.getElementById(button.getAttribute("aria-controls"));
      window.clearTimeout(panelTimers.get(panel));
      button.setAttribute("aria-expanded", "true");
      panel.hidden = false;
      panel.style.maxHeight = "0px";
      requestAnimationFrame(() => {
        panel.classList.add("is-open");
        panel.style.maxHeight = `${panel.scrollHeight}px`;
      });
    });
  });
}

async function loadPortfolio() {
  try {
    const response = await fetch(contentPath, { cache: "no-store" });
    if (!response.ok) throw new Error(`Unable to load ${contentPath}`);
    const content = await response.json();
    renderContent(content);
    setupNavigation();
    setupProjectToggle();
    setupProjectModal();
    setupExperienceAccordions();
  } catch (error) {
    console.error(error);
    document.querySelector("main").innerHTML = `
      <section class="hero"><div class="hero-copy"><p class="hero-description">Portfolio content could not be loaded. Start the local web server and refresh this page.</p></div></section>`;
  }
}

document.querySelector("#year").textContent = new Date().getFullYear();

const toast = document.querySelector(".draft-toast");
let toastTimer;
document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-draft-link]");
  if (!link) return;
  event.preventDefault();
  clearTimeout(toastTimer);
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
});

loadPortfolio();
