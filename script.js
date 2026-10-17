setDefaultDates();
renderDashboard();
renderWellness();

const initialSection = window.location.hash.replace("#", "");


if (initialSection && getElement(initialSection)?.classList.contains("content-section")) 
    {showSection(initialSection);} 
else {showSection("home");}

const transactions = [];

const wellnessActivities = [];

const charts = {};

function formatCurrency(amount) {
  return currencyFormatter.format(amount);
}

const currencyFormatter = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR"
});


function getElement(id) {
  return document.getElementById(id);
}

function showModal(title, message) {
  const modalElement = getElement("infoModal");

  if (!modalElement || !window.bootstrap) {
    alert(message);
    return;
  }

  const titleElement = getElement("infoModalTitle");

  if (titleElement) {
    titleElement.textContent = title;
  }

  let body = modalElement.querySelector(".modal-body");

  // Your supplied HTML omits the modal body,
  // so create it when necessary.
  if (!body) {
    body = document.createElement("div");
    body.className = "modal-body";
    modalElement.querySelector(".modal-header")
      ?.after(body);
  }

  body.textContent = message;

  bootstrap.Modal.getOrCreateInstance(modalElement).show();
}

function setDefaultDates() {const today = new Date();const localDate = [today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
  ].join("-");

  const transactionDate = getElement("transactionDate");
  const activityDate = getElement("activityDate");

  if (transactionDate) transactionDate.value = localDate;
  if (activityDate) activityDate.value = localDate;}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}


function showSection(sectionId) {
  const target = getElement(sectionId);

  

  document.querySelectorAll(".content-section").forEach(section => {
    section.classList.add("d-none");
  });

  target.classList.remove("d-none");
  document.querySelectorAll(".sidebar-nav [data-section]")
    .forEach(link => {
      link.classList.toggle(
        "active",
        link.dataset.section === sectionId
      );
    }
);

  getElement("sidebar")?.classList.remove("mobile-open");

  if (sectionId === "dashboard") {
    renderDashboard();
  }

  if (sectionId === "wellness") {
    renderWellness();
  }
}

document.querySelectorAll("[data-section]").forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();

    const sectionId = link.dataset.section;
    showSection(sectionId);


    history.replaceState(null, "", `#${sectionId}`);
  });
});

// Sidebar 

getElement("sidebar-toggle")?.addEventListener("click", () => {
  const sidebar = getElement("sidebar");

  if (!sidebar) return;

  sidebar.classList.toggle("collapsed");
  document.body.classList.toggle("sidebar-collapsed");

  const icon = sidebar.querySelector(".sidebar-toggle i");

  if (icon) {
    icon.className = sidebar.classList.contains("collapsed")
      ? "bi bi-chevron-right"
      : "bi bi-chevron-left";
  }
});

getElement("mobilemenubtn")?.addEventListener("click", () => {
  getElement("sidebar")?.classList.toggle("mobile-open");
});


// Data Form


const transactionForm = getElement("transactionForm");

transactionForm?.addEventListener("submit", event => 
    {
  event.preventDefault();

  const date = getElement("transactionDate").value;
  const type = getElement("transactionType").value;
  const category = getElement("transactionCategory").value;
  const amount = Number(getElement("transactionAmount").value);
  const description = getElement("transactionDescription").value.trim();

  if (!date || !type || !category || !Number.isFinite(amount) || amount <= 0) {
    showModal("Check your entries", "Enter a valid date, type, category and amount.");
    return;
  }

  transactions.push({
    id: Date.now() + Math.random(),
    date,
    type,
    category,
    amount,
    description
  });

  transactionForm.reset();
  setDefaultDates();

  renderDashboard();

  showModal("Transaction added", "Your transaction has been added to this session.");
});

transactionForm?.addEventListener("reset", () => {
  // reset the form first
  setTimeout(() => {
    const date = getElement("transactionDate");
    if (date && !date.value) setDefaultDates();
  }, 0);
});

// Data Display


function renderDashboard() {
  const filtered = getFilteredTransactions();

  const revenue = filtered
    .filter(item => item.type === "Revenue")
    .reduce((total, item) => total + item.amount, 0);

  const expenses = filtered
    .filter(item => item.type === "Expense")
    .reduce((total, item) => total + item.amount, 0);

  const netResult = revenue - expenses;

  if (getElement("totalRevenue")) {getElement("totalRevenue").textContent = formatCurrency(revenue);}

  if (getElement("totalExpenses")) {getElement("totalExpenses").textContent = formatCurrency(expenses);}

  if (getElement("netResult")) 
    {getElement("netResult").textContent = formatCurrency(netResult);
    getElement("netResult").style.color =netResult < 0 ? "var(--danger)" : "var(--success)";}

  if (getElement("transactionCount")) {getElement("transactionCount").textContent = filtered.length;}

  renderTransactionTable(filtered);
  renderCharts(filtered);
}

function renderTransactionTable(records) {const tbody = getElement("transactionTableBody");

  if (!tbody) return;tbody.replaceChildren();

  if (records.length === 0) 
    {const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "text-center text-muted";
    cell.textContent = "No matching transactions. Enter data or load demo data.";
    row.appendChild(cell);
    tbody.appendChild(row);
    return;}

  records.slice().sort((a, b) => b.date.localeCompare(a.date))
    .forEach(transaction => {
      const row = document.createElement("tr");

      [
        transaction.date,
        transaction.type,
        transaction.category,
        transaction.description || "—"
      ].forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });

      const amountCell = document.createElement("td");
      amountCell.className = "text-end";
      amountCell.textContent = formatCurrency(transaction.amount);
      row.appendChild(amountCell);

      tbody.appendChild(row);
    });
}


function drawChart(canvasId, type, labels, datasets, options = {}) {
  const canvas = getElement(canvasId);

  if (!canvas || typeof Chart === "undefined") return;

  // Reset
  if (charts[canvasId]) {charts[canvasId].destroy();}

  charts[canvasId] = new Chart(canvas, {
    type,
    data: { labels, datasets },
    options: {responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: "#dfe5f7" }
        }},
      scales: type === "doughnut" ? {} : {
        x: {
          ticks: { color: "#a8b3cc" },
          grid: { color: "rgba(168,179,204,0.10)" }
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#a8b3cc" },
          grid: { color: "rgba(168,179,204,0.10)" }
        }
      },
      ...options
    }
  });
}

function renderCharts(records) {
  const categories = [...new Set(records.map(item => item.category))].sort();

  // Revenue trend by date
  const revenueByDate = {};

  records.filter(item => item.type === "Revenue").forEach(item => {
    revenueByDate[item.date] =
      (revenueByDate[item.date] || 0) + item.amount;
  });

  const trendDates = Object.keys(revenueByDate).sort();

  drawChart(
    "revenueTrendChart",
    "line",
    trendDates,
    [{
      label: "Revenue",
      data: trendDates.map(date => revenueByDate[date]),
      borderColor: "#8b7cff",
      backgroundColor: "rgba(139,124,255,0.18)",
      fill: true,
      tension: 0.3
    }]
  );

  // Calculations
  const expensesByCategory = categories.map(category =>
    records
      .filter(item => item.type === "Expense" && item.category === category)
      .reduce((total, item) => total + item.amount, 0));

  drawChart(
    "expenseBreakdownChart",
    "doughnut",
    categories.filter((category, index) => expensesByCategory[index] > 0),
    [{
      label: "Expenses",
      data: categories
        .map((category, index) => ({
          category,
          amount: expensesByCategory[index]
        }))
        .filter(item => item.amount > 0)
        .map(item => item.amount),
      backgroundColor: [
        "#8b7cff",
        "#4f8cff",
        "#38d9a9",
        "#ffbd69",
        "#ff7185",
        "#56cfe1",
        "#c77dff"
      ]

    }
]
  );

  // Category by comparison
  const revenueByCategory = categories.map(category =>
    records
      .filter(item => item.type === "Revenue" && item.category === category)
      .reduce((total, item) => total + item.amount, 0));

  drawChart(
    "revenueExpenseChart",
    "bar",
    categories,

    [

      {

        label: "Revenue",
        data: revenueByCategory,
        backgroundColor: "#38d9a9"},
      {
        label: "Expenses",
        data: expensesByCategory,
        backgroundColor: "#ff7185"
      }
    ]
  );

  // Performance
  const netByCategory = categories.map((category, index) =>
    revenueByCategory[index] - expensesByCategory[index]
  );

  drawChart(
    "categoryPerformanceChart",
    "bar",
    categories,
    [{
      label: "Net result",
      data: netByCategory,
      backgroundColor: netByCategory.map(value =>
        value < 0 ? "#ff7185" : "#8b7cff"
      )
    }],
    {
      indexAxis: "y",
      scales: {
        x: {
          ticks: { color: "#a8b3cc" },
          grid: { color: "rgba(168,179,204,0.10)" }
        },
        y: {
          ticks: { color: "#a8b3cc" },
          grid: { display: false }
        }
      }
    }
  );
}

//DEMO DATA


getElement("loadDemoBtn")?.addEventListener("click", () => {
  if (transactions.length > 0 &&
      !confirm("Add demo transactions to your existing records?")) {
    return;
  }

  const today = new Date();

  function dateDaysAgo(days) {
    const date = new Date(today);
    date.setDate(date.getDate() - days);

    return [date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")].join("-");
  }

  const demoTransactions = [
    [0, "Revenue", "Sales", 12500, "Product sales"],
    [2, "Expense", "Operations", 3200, "Operating costs"],
    [4, "Revenue", "Services", 7800, "Consulting services"],
    [7, "Expense", "Marketing", 1450, "Marketing campaign"],
    [10, "Revenue", "Transport", 5600, "Delivery income"],
    [13, "Expense", "Salaries", 4200, "Staff costs"],
    [18, "Revenue", "Sales", 9600, "Monthly sales"],
    [21, "Expense", "Transport", 1850, "Vehicle costs"]
  ]
  ;

  demoTransactions.forEach(([days, type, category, amount, description]) => 
    {
    
        transactions.push({
      id: Date.now() + Math.random(),
      date: dateDaysAgo(days),
      type,
      category,
      amount,
      description
    }
);
  });

  renderDashboard();

  showModal("Demo data loaded", "Sample transactions have been added for demonstration.");
});


// Refresh

getElement("clearDataBtn")?.addEventListener("click", () => {
  if (transactions.length === 0) {
    showModal("No data", "There are no transaction records to clear.");
    return;
  }

  if (!confirm("Clear all transaction records from this session?")) {
    return;
  }

  transactions.length = 0;

  if (getElement("filterStartDate")) {
    getElement("filterStartDate").value = "";
  }

  if (getElement("filterEndDate")) {
    getElement("filterEndDate").value = "";
  }

  if (getElement("filterCategory")) {
    getElement("filterCategory").value = "All";
  }

  renderDashboard();
});

// Feedback
getElement("feedbackForm")?.addEventListener("submit", event => {
  event.preventDefault();

  showModal(
    "Thank you for your feedback",
    "This is a demonstration form. Your feedback has not been sent or stored."
  );

  event.currentTarget.reset();
});

// Button responsiveness


getElement("homeHelptn")?.addEventListener("click", () => {
  showModal( "Getting started",
    "Enter revenue and expense transactions, then open the Dashboard to view your KPIs and charts. Use the filters to narrow the results.");
}
)
;

getElement("subscriptionBtn")?.addEventListener("click", () => {
  showModal(
    "Premium preview",
    "This is an illustrative subscription preview. No payment or subscription is processed."
  );
});


// Bot pop-ups

function addChatMessage(message, className = "bot-message") {
  const chatBody = getElement("chatBody");

  if (!chatBody) return;

  const bubble = document.createElement("div");
  bubble.className = `chat-message ${className}`
  ;
  bubble.textContent = message;

  chatBody.appendChild(bubble);
  bubble.scrollIntoView({ block: "nearest" });}

getElement("openChatBtn")?.addEventListener("click", () => {
  getElement("chatPanel")?.classList.remove("d-none");
});

getElement("closeChatBtn")?.addEventListener("click", () => 
    {getElement("chatPanel")?.classList.add("d-none");}
);

document.querySelectorAll("[data-chat]").forEach(button => {
  button.addEventListener("click", () => {
    const topic = button.dataset.chat;

    if (topic === "analytics") {
      addChatMessage(
        "Analytics help",
        "user-message"
      );

      addChatMessage("Enter transactions first. The dashboard then calculates revenue, expenses and net result, and updates the charts using your selected filters.");
    } else if (topic === "premium") {
      addChatMessage(
        "Premium features",
        "user-message"
      );

      addChatMessage("The premium cards are previews of possible forecasting, anomaly detection and advanced comparison features. They are not connected to real AI services.");
    }
  }
);
}
);

