const projects = [
  {
    title: "Swim Performance Forecasting",
    tag: "Machine Learning",
    category: ["ml", "analytics"],
    description:
      "End-to-end data science pipeline that scrapes Swimcloud race records, anonymizes swimmer identifiers, and predicts future swim performance from historical results.",
    tech: ["Python", "BeautifulSoup", "Selenium", "scikit-learn", "Streamlit"],
    highlights: [
      "Processed 100,000+ Swimcloud race records",
      "Reduced prediction error by 23% using Gradient Boosting",
      "Built an interactive dashboard for best-, mid-, and worst-case forecasts"
    ],
    demoUrl: "",
    codeUrl: "https://github.com/tmk-07/swim-performance-forecasting"
  },
  {
    title: "Trouble Strategy Simulator",
    tag: "Simulation and RL",
    category: ["ml", "analytics"],
    description:
      "Python simulation engine for the board game Trouble with heuristic agents, reinforcement-learning agents, and Monte Carlo strategy evaluation.",
    tech: ["Python", "Reinforcement Learning", "Monte Carlo", "Simulation"],
    highlights: [
      "Built a custom simulation engine for four-player game experiments",
      "Trained a softmax policy-gradient bot using move-based features",
      "Reached about 30% win rate against near-optimal heuristic agents"
    ],
    demoUrl: "",
    codeUrl: "https://github.com/tmk-07/trouble_analysis_simulation"
  },
  {
    title: "NBA Lead Tracker Visualization",
    tag: "Sports Analytics",
    category: ["analytics", "web"],
    description:
      "Full-stack basketball visualization app that transforms NBA play-by-play data into animated score differential timelines.",
    tech: ["React", "Vite", "FastAPI", "Python", "pandas", "nba_api"],
    highlights: [
      "Fetched and cleaned NBA play-by-play data with a FastAPI backend",
      "Generated point-differential timelines from scoring events",
      "Designed playback controls, speed adjustment, and timeline navigation"
    ],
    demoUrl: "https://nbaleadtracker.vercel.app/",
    codeUrl: "https://github.com/tmk-07/nba-lead-tracker"
  },
  {
    title: "Basketball Shot Tracker",
    tag: "Frontend Tool",
    category: ["web"],
    description:
      "Mobile-friendly basketball shooting tracker that records makes and misses, calculates live field goal percentage, and saves shot history on-device.",
    tech: ["HTML", "CSS", "JavaScript", "localStorage", "Cloudflare Pages"],
    highlights: [
      "Built a touch-friendly single-page app for workouts",
      "Used localStorage to persist shot totals without a backend",
      "Deployed as a fast static web app through Cloudflare Pages"
    ],
    demoUrl: "https://shot-tracker.timmykim07.workers.dev/",
    codeUrl: "https://github.com/tmk-07/shot-tracker"
  },
  {
    title: "NFL Running Play Impact Research",
    tag: "Research",
    category: ["ml", "analytics"],
    description:
      "Sports analytics research project using NFL positional data, convolutional neural networks, and Grad-CAM heat maps to study high-impact running plays.",
    tech: ["Python", "CNN", "Grad-CAM", "Matplotlib", "Excel"],
    highlights: [
      "Visualized 2,500,000+ NFL positional data points",
      "Developed CNN-based approach for yardage outcome prediction",
      "Used Grad-CAM heat maps to interpret predictive field areas"
    ],
    demoUrl: "https://drive.google.com/file/d/1CqoLd63kK2pWC5QLk6DLB91aiaDT1iKj/view?usp=sharing",
    codeUrl: "https://github.com/chadhimes/AI.DataLab"
  }
];

const projectGrid = document.querySelector("#projectGrid");
const filterButtons = document.querySelectorAll(".filter");

function makeProjectCard(project) {
  const techItems = project.tech.map((item) => `<li>${item}</li>`).join("");
  const highlightItems = project.highlights.map((item) => `<li>${item}</li>`).join("");

  const demoLink = project.demoUrl
    ? `<a href="${project.demoUrl}" target="_blank" rel="noreferrer" aria-label="View ${project.title} demo">Live Demo</a>`
    : "";

  const codeLink = project.codeUrl
    ? `<a href="${project.codeUrl}" target="_blank" rel="noreferrer" aria-label="View ${project.title} code">GitHub</a>`
    : "";

  return `
    ...
    <div class="project-links">
      <a href="${project.demoUrl}" target="_blank" rel="noreferrer" aria-label="View ${project.title} demo">Live Demo</a>
      <a href="${project.codeUrl}" target="_blank" rel="noreferrer" aria-label="View ${project.title} code">GitHub</a>
    </div>
  `;
}

function renderProjects(filter = "all") {
  const filteredProjects =
    filter === "all"
      ? projects
      : projects.filter((project) => project.category.includes(filter));

  projectGrid.innerHTML = filteredProjects.map(makeProjectCard).join("");
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    renderProjects(button.dataset.filter);
  });
});

renderProjects();
