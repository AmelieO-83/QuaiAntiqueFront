import { getToken, getApiBase } from "/js/src/api.js";

// Chart.js via CDN (si pas déjà présent globalement)
if (!window.Chart) {
  await import(
    "https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"
  );
}

const YEAR_MIN = 2023;
const YEAR_MAX = new Date().getFullYear() + 1;

const yearSelect = document.getElementById("yearSelect");
for (let y = YEAR_MIN; y <= YEAR_MAX; y++) {
  const o = document.createElement("option");
  o.value = y;
  o.textContent = y;
  if (y === new Date().getFullYear()) o.selected = true;
  yearSelect.appendChild(o);
}

const ctx = document.getElementById("statsChart");
let chart;

async function load(year) {
  const base = getApiBase();
  const res = await fetch(
    `${base}/api/analytics/booking-by-month?year=${year}`,
    {
      headers: {
        Accept: "application/json",
        "X-AUTH-TOKEN": getToken(),
      },
    }
  );
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const { data } = await res.json(); // { "01": n, ... "12": n }
  const labels = [
    "Jan",
    "Fév",
    "Mar",
    "Avr",
    "Mai",
    "Juin",
    "Juil",
    "Août",
    "Sep",
    "Oct",
    "Nov",
    "Déc",
  ];
  const values = labels.map(
    (_, i) => data[String(i + 1).padStart(2, "0")] ?? 0
  );

  const dataset = {
    label: `Réservations ${year}`,
    data: values,
    tension: 0.2,
    fill: true,
  };

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets = [dataset];
    chart.update();
  } else {
    chart = new Chart(ctx, {
      type: "line",
      data: { labels, datasets: [dataset] },
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    });
  }
}

yearSelect.addEventListener("change", () =>
  load(parseInt(yearSelect.value, 10))
);

// 1er rendu
load(parseInt(yearSelect.value, 10)).catch((err) => {
  console.error(err);
  alert("Impossible de charger les statistiques.");
});
