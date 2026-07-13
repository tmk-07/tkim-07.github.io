const researchProjects = [
  {
    title: "Swim Performance Forecasting",
    type: "Machine Learning",
    description:
      "An end-to-end pipeline that collects historical Swimcloud race data and forecasts future swimmer performance from progression patterns.",
    details: [
      "100,000+ race records processed",
      "Gradient Boosting reduced prediction error by 23%",
      "Interactive best-, mid-, and worst-case forecasts"
    ],
    tech: ["Python", "Selenium", "scikit-learn", "Streamlit"],
    codeUrl: "https://github.com/tmk-07/swim-performance-forecasting"
  },
  {
    title: "Trouble Strategy Simulator",
    type: "Simulation · Reinforcement Learning",
    description:
      "A custom four-player simulation engine used to compare heuristics, Monte Carlo strategies, and reinforcement-learning agents for the board game Trouble.",
    details: [
      "Custom rule and game-state engine",
      "Softmax policy-gradient agent",
      "Approximately 30% win rate against strong heuristic agents"
    ],
    tech: ["Python", "Reinforcement Learning", "Monte Carlo"],
    codeUrl: "https://github.com/tmk-07/trouble_analysis_simulation"
  },
  {
    title: "NFL Running Play Impact Research",
    type: "Sports Analytics Research",
    description:
      "Research using NFL positional tracking data, convolutional neural networks, and Grad-CAM to identify field regions that influence rushing outcomes.",
    details: [
      "2.5M+ positional data points visualized",
      "CNN-based yardage prediction approach",
      "Grad-CAM heat maps for model interpretation"
    ],
    tech: ["Python", "CNN", "Grad-CAM", "Matplotlib"],
    demoUrl: "https://drive.google.com/file/d/1CqoLd63kK2pWC5QLk6DLB91aiaDT1iKj/view?usp=sharing",
    codeUrl: "https://github.com/chadhimes/AI.DataLab"
  }
];

const researchGrid = document.querySelector("#researchGrid");

function createProjectCard(project, index) {
  const details = project.details.map((item) => `<li>${item}</li>`).join("");
  const tech = project.tech.map((item) => `<li>${item}</li>`).join("");

  const links = [
    project.demoUrl
      ? `<a href="${project.demoUrl}" target="_blank" rel="noreferrer">View research <span aria-hidden="true">↗</span></a>`
      : "",
    project.codeUrl
      ? `<a href="${project.codeUrl}" target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a>`
      : ""
  ].join("");

  return `
    <article class="project-card">
      <div class="project-index">${String(index + 1).padStart(2, "0")}</div>

      <div class="project-main">
        <p class="project-type">${project.type}</p>
        <h3>${project.title}</h3>
        <p class="project-description">${project.description}</p>
        <ul class="project-details">${details}</ul>
      </div>

      <div class="project-meta">
        <ul class="tech-list">${tech}</ul>
        <div class="project-links">${links}</div>
      </div>
    </article>
  `;
}

researchGrid.innerHTML = researchProjects.map(createProjectCard).join("");
document.querySelector("#year").textContent = new Date().getFullYear();
