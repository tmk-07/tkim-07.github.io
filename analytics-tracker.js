(() => {
  const liveHost = "timothykim.tkimify.com";
  if (window.location.hostname !== liveHost) return;

  const endpoint = "https://timothy-portfolio-cms-auth.tmkm.workers.dev/analytics/event";
  const storageKey = "portfolio_analytics_session";
  let sessionId = sessionStorage.getItem(storageKey);

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(storageKey, sessionId);
  }

  function clean(value, length = 120) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, length);
  }

  function referrerHost() {
    if (!document.referrer) return "Direct";
    try {
      const host = new URL(document.referrer).hostname;
      return host === window.location.hostname ? "Internal" : host;
    } catch {
      return "Unknown";
    }
  }

  function send(eventName, target = "") {
    const body = JSON.stringify({
      sessionId,
      eventName,
      target: clean(target),
      page: clean(window.location.pathname, 160),
      referrer: referrerHost(),
    });

    fetch(endpoint, {
      method: "POST",
      mode: "cors",
      keepalive: true,
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body,
    }).catch(() => {});
  }

  function clickDetails(element) {
    const projectDetails = element.closest("[data-project-details]");
    if (projectDetails) return ["project_open", `details:${projectDetails.dataset.projectDetails}`];

    const projectCard = element.closest("[data-project-card]");
    if (projectCard && !element.closest("a, button")) {
      return ["project_open", `card:${projectCard.dataset.projectCard}`];
    }

    const detailTab = element.closest("[data-detail-tab]");
    if (detailTab) return ["detail_tab", detailTab.dataset.detailTab];

    const experience = element.closest(".experience-toggle");
    if (experience) {
      const company = experience.querySelector("strong")?.textContent;
      const action = experience.getAttribute("aria-expanded") === "true" ? "collapse" : "expand";
      return ["experience_toggle", `${action}:${clean(company)}`];
    }

    const link = element.closest("a[href]");
    if (link) {
      const href = link.getAttribute("href") || "";
      if (href.startsWith("#")) return ["section_click", href.slice(1) || "top"];
      try {
        const url = new URL(link.href, window.location.href);
        return ["link_click", `${url.hostname}${url.pathname}`];
      } catch {
        return ["link_click", clean(link.textContent)];
      }
    }

    const button = element.closest("button");
    if (button) return ["button_click", clean(button.getAttribute("aria-label") || button.textContent)];
    return null;
  }

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const details = clickDetails(event.target);
    if (details) send(details[0], details[1]);
  }, { capture: true });

  send("page_view", "homepage");
})();
