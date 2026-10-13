/**
 * Main Application Controller for RetainAI Enterprise
 * Employee Attrition Prediction & HR Analytics Platform
 */

document.addEventListener('DOMContentLoaded', () => {
  // Department to Job Roles Mapping
  const DEPARTMENT_ROLES = {
    'Research & Development': [
      'Research Scientist',
      'Laboratory Technician',
      'Manufacturing Director',
      'Healthcare Representative',
      'Manager',
      'Research Director'
    ],
    'Sales': [
      'Sales Executive',
      'Sales Representative',
      'Manager'
    ],
    'Human Resources': [
      'Human Resources',
      'Manager'
    ]
  };

  // Global App State
  const state = {
    activeTab: 'predictor',
    employees: [],
    filteredEmployees: [],
    sortColumn: 'risk',
    sortDirection: 'desc',
    selectedEmployee: null,
    charts: {},
    currentPrediction: null,
    baselineForSimulator: null,
    batchScoredRecords: []
  };

  // Initialize
  initApp();

  function initApp() {
    initLucideIcons();
    initTabNavigation();
    initDepartmentRoleBinding();
    initEmployeesData();
    initPredictor();
    initSimulator();
    initCharts();
    initTableFilters();
    initTableSorting();
    initBatchUploader();
    initDrawer();

    // Default trigger first prediction with Sarah persona
    loadPersona('sarah');
  }

  function initLucideIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // --- Tab Navigation ---
  function initTabNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        window.location.hash = tabId;
        switchTab(tabId);
      });
    });

    // Check URL hash if present
    const hash = window.location.hash.replace('#', '');
    if (hash && ['predictor', 'dashboard', 'roster', 'batch'].includes(hash)) {
      switchTab(hash);
    }

    window.addEventListener('hashchange', () => {
      const currentHash = window.location.hash.replace('#', '');
      if (currentHash && ['predictor', 'dashboard', 'roster', 'batch'].includes(currentHash)) {
        switchTab(currentHash);
      }
    });
  }

  function switchTab(tabId) {
    state.activeTab = tabId;

    document.querySelectorAll('.tab-btn').forEach(btn => {
      const isActive = btn.getAttribute('data-tab') === tabId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });

    // Re-render / resize charts if dashboard tab opened
    if (tabId === 'dashboard') {
      setTimeout(() => {
        Object.values(state.charts).forEach(chart => {
          if (chart && chart.resize) chart.resize();
        });
      }, 50);
    }
  }

  // --- Dynamic Job Roles based on Department ---
  function initDepartmentRoleBinding() {
    const deptSelect = document.getElementById('department');
    if (!deptSelect) return;

    deptSelect.addEventListener('change', (e) => {
      updateJobRolesForDepartment(e.target.value);
      runLivePrediction();
    });
  }

  function updateJobRolesForDepartment(dept, selectedRole = null) {
    const roleSelect = document.getElementById('jobRole');
    if (!roleSelect) return;

    const roles = DEPARTMENT_ROLES[dept] || DEPARTMENT_ROLES['Research & Development'];
    roleSelect.innerHTML = roles.map(r => `<option value="${r}">${r}</option>`).join('');

    if (selectedRole && roles.includes(selectedRole)) {
      roleSelect.value = selectedRole;
    } else {
      roleSelect.value = roles[0];
    }
  }

  // --- Prepare 30 Sample Employees ---
  function initEmployeesData() {
    state.employees = HR_DATA.sampleEmployees.slice(0, 30).map(emp => {
      const pred = MLEngine.predict({
        overTime: emp.overTime,
        businessTravel: emp.travel,
        jobSatisfaction: emp.jobSat,
        environmentSatisfaction: emp.envSat,
        workLifeBalance: emp.wlb,
        monthlyIncome: emp.income,
        jobLevel: getJobLevelFromRole(emp.role),
        jobRole: emp.role,
        yearsSinceLastPromotion: Math.max(0, Math.floor(emp.tenure * 0.4)),
        yearsWithCurrManager: Math.max(0, Math.floor(emp.tenure * 0.6)),
        stockOptionLevel: emp.income > 8000 ? 1 : 0,
        distanceFromHome: 10,
        age: emp.age
      });

      return {
        ...emp,
        prediction: pred
      };
    });

    state.filteredEmployees = [...state.employees];
    sortAndRenderTable();
  }

  function getJobLevelFromRole(role) {
    if (role.includes('Director') || role.includes('Manager')) return 4;
    if (role.includes('Healthcare') || role.includes('Executive')) return 3;
    if (role.includes('Scientist')) return 2;
    return 1;
  }

  // --- Predictor Form Handling ---
  function initPredictor() {
    const form = document.getElementById('attrition-form');
    if (!form) return;

    // Range sliders dynamic label update
    const sliders = form.querySelectorAll('input[type="range"]');
    sliders.forEach(slider => {
      const valDisplay = document.getElementById(`val-${slider.id}`);
      if (valDisplay) {
        valDisplay.textContent = slider.value;
      }
      slider.addEventListener('input', (e) => {
        if (valDisplay) {
          if (slider.id === 'monthlyIncome') {
            valDisplay.textContent = '$' + Number(e.target.value).toLocaleString();
          } else if (slider.id === 'distanceFromHome') {
            valDisplay.textContent = e.target.value + ' mi';
          } else if (slider.id.includes('Years') || slider.id === 'yearsAtCompany') {
            valDisplay.textContent = e.target.value + ' yrs';
          } else {
            valDisplay.textContent = e.target.value;
          }
        }
        runLivePrediction();
      });
    });

    // Inputs & Selects trigger live prediction
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
      if (input.type !== 'range') {
        input.addEventListener('change', runLivePrediction);
      }
    });

    // Persona preset chips
    const personaChips = document.querySelectorAll('.persona-chip');
    personaChips.forEach(chip => {
      chip.addEventListener('click', () => {
        personaChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const personaKey = chip.getAttribute('data-persona');
        loadPersona(personaKey);
        showToast(`Loaded ${HR_DATA.personas[personaKey].name} profile benchmark`, 'success');
      });
    });

    // Manual Form Submit button
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      runLivePrediction();
      showToast('Machine Learning prediction updated!', 'success');
    });
  }

  function loadPersona(key) {
    const persona = HR_DATA.personas[key];
    if (!persona) return;

    const form = document.getElementById('attrition-form');
    if (!form) return;

    // Update Department & dynamic Job Role first
    setInputValue('department', persona.department);
    updateJobRolesForDepartment(persona.department, persona.jobRole);

    // Fill form fields
    setInputValue('age', persona.age);
    setInputValue('jobLevel', persona.jobLevel);
    setInputValue('monthlyIncome', persona.monthlyIncome, '$' + persona.monthlyIncome.toLocaleString());
    setInputValue('businessTravel', persona.businessTravel);
    setInputValue('distanceFromHome', persona.distanceFromHome, persona.distanceFromHome + ' mi');
    setInputValue('maritalStatus', persona.maritalStatus);
    setInputValue('jobSatisfaction', persona.jobSatisfaction);
    setInputValue('environmentSatisfaction', persona.environmentSatisfaction);
    setInputValue('workLifeBalance', persona.workLifeBalance);
    setInputValue('yearsAtCompany', persona.yearsAtCompany, persona.yearsAtCompany + ' yrs');
    setInputValue('yearsSinceLastPromotion', persona.yearsSinceLastPromotion, persona.yearsSinceLastPromotion + ' yrs');
    setInputValue('yearsWithCurrManager', persona.yearsWithCurrManager, persona.yearsWithCurrManager + ' yrs');
    setInputValue('stockOptionLevel', persona.stockOptionLevel);

    const overTimeCheckbox = document.getElementById('overTime');
    if (overTimeCheckbox) {
      overTimeCheckbox.checked = persona.overTime === 'Yes';
    }

    runLivePrediction();
  }

  function setInputValue(id, val, displayVal) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = val;
    const valDisplay = document.getElementById(`val-${id}`);
    if (valDisplay) {
      valDisplay.textContent = displayVal || val;
    }
  }

  function getFormData() {
    const form = document.getElementById('attrition-form');
    if (!form) return {};

    const overTimeEl = document.getElementById('overTime');
    return {
      age: Number(document.getElementById('age')?.value) || 30,
      department: document.getElementById('department')?.value || 'Research & Development',
      jobRole: document.getElementById('jobRole')?.value || 'Research Scientist',
      jobLevel: Number(document.getElementById('jobLevel')?.value) || 2,
      monthlyIncome: Number(document.getElementById('monthlyIncome')?.value) || 5000,
      businessTravel: document.getElementById('businessTravel')?.value || 'Travel_Rarely',
      distanceFromHome: Number(document.getElementById('distanceFromHome')?.value) || 10,
      maritalStatus: document.getElementById('maritalStatus')?.value || 'Single',
      jobSatisfaction: Number(document.getElementById('jobSatisfaction')?.value) || 3,
      environmentSatisfaction: Number(document.getElementById('environmentSatisfaction')?.value) || 3,
      workLifeBalance: Number(document.getElementById('workLifeBalance')?.value) || 3,
      yearsAtCompany: Number(document.getElementById('yearsAtCompany')?.value) || 3,
      yearsSinceLastPromotion: Number(document.getElementById('yearsSinceLastPromotion')?.value) || 1,
      yearsWithCurrManager: Number(document.getElementById('yearsWithCurrManager')?.value) || 2,
      stockOptionLevel: Number(document.getElementById('stockOptionLevel')?.value) || 0,
      overTime: overTimeEl && overTimeEl.checked ? 'Yes' : 'No'
    };
  }

  function runLivePrediction() {
    const data = getFormData();
    const result = MLEngine.predict(data);
    state.currentPrediction = result;
    state.baselineForSimulator = { ...data, baselineProb: result.probability };

    updatePredictionDisplay(result);
    updateSimulatorBaseline(result.probability);
  }

  function updatePredictionDisplay(res) {
    // 1. Gauge Needle / SVG Progress Arc
    const scoreNum = document.getElementById('gauge-score-value');
    if (scoreNum) {
      scoreNum.textContent = `${res.probability}%`;
      scoreNum.style.color = res.riskColor;
    }

    const badge = document.getElementById('risk-tier-badge');
    if (badge) {
      badge.textContent = res.riskTier.toUpperCase();
      badge.className = `risk-badge-large ${res.badgeClass}`;
    }

    // Arc path calculation: circumference is approx 283 for r=80 semicircle
    const progressPath = document.getElementById('gauge-progress-arc');
    if (progressPath) {
      const maxDash = 283;
      const offset = maxDash - (maxDash * (res.probability / 100));
      progressPath.style.strokeDashoffset = offset;
      progressPath.style.stroke = res.riskColor;
    }

    const confScore = document.getElementById('confidence-val');
    if (confScore) confScore.textContent = res.confidenceScore;

    const costVal = document.getElementById('replacement-cost-val');
    if (costVal) costVal.textContent = `$${res.estimatedRetentionCost.toLocaleString()}`;

    // 2. Feature Drivers Breakdown
    const driversList = document.getElementById('drivers-list');
    if (driversList) {
      driversList.innerHTML = '';
      res.drivers.forEach(d => {
        const isRisk = d.direction === 'risk';
        const item = document.createElement('div');
        item.className = 'driver-item';
        item.innerHTML = `
          <div class="driver-info">
            <span class="driver-name">${d.name}</span>
            <span class="driver-impact ${isRisk ? 'positive' : 'negative'}">${isRisk ? '+' : ''}${d.impact}%</span>
          </div>
          <div class="driver-bar-track">
            <div class="driver-bar-fill ${isRisk ? 'risk-driver' : 'safe-driver'}" style="width: ${Math.min(100, Math.abs(d.impact) * 4)}%"></div>
          </div>
        `;
        driversList.appendChild(item);
      });
    }

    // 3. Retention Recommendations
    const recsList = document.getElementById('recommendations-list');
    if (recsList) {
      recsList.innerHTML = '';
      res.recommendations.forEach(r => {
        const li = document.createElement('li');
        li.textContent = r;
        recsList.appendChild(li);
      });
    }
  }

  // --- What-If Scenario Simulator & Collapsible ---
  function initSimulator() {
    const simSalary = document.getElementById('sim-salary-boost');
    const simOT = document.getElementById('sim-eliminate-ot');
    const simWLB = document.getElementById('sim-wlb-boost');
    const simPromo = document.getElementById('sim-promote');

    const toggleHeader = document.getElementById('simulator-toggle-header');
    const toggleBtn = document.getElementById('btn-toggle-sandbox');
    const toggleIcon = document.getElementById('icon-sandbox-toggle');
    const simBody = document.getElementById('simulator-body');

    const toggleSimulator = () => {
      if (!simBody) return;
      const isCollapsed = simBody.classList.toggle('collapsed');
      if (toggleIcon) {
        toggleIcon.setAttribute('data-lucide', isCollapsed ? 'chevron-down' : 'chevron-up');
        initLucideIcons();
      }
    };

    if (toggleHeader) {
      toggleHeader.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'LABEL') {
          toggleSimulator();
        }
      });
    }
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSimulator();
      });
    }

    const handleSimChange = () => {
      if (!state.baselineForSimulator) return;

      const simSalaryVal = Number(simSalary?.value) || 0;
      const simOTVal = simOT?.checked;
      const simWLBVal = simWLB?.checked;
      const simPromoVal = simPromo?.checked;

      const label = document.getElementById('sim-salary-val');
      if (label) label.textContent = `+${simSalaryVal}%`;

      // Copy baseline data and apply simulated interventions
      const simData = { ...state.baselineForSimulator };

      if (simSalaryVal > 0) {
        simData.monthlyIncome = simData.monthlyIncome * (1 + simSalaryVal / 100);
      }
      if (simOTVal) {
        simData.overTime = 'No';
      }
      if (simWLBVal) {
        simData.workLifeBalance = 4;
      }
      if (simPromoVal) {
        simData.yearsSinceLastPromotion = 0;
        simData.jobLevel = Math.min(5, simData.jobLevel + 1);
      }

      const simResult = MLEngine.predict(simData);
      renderSimulatorOutcome(state.baselineForSimulator.baselineProb, simResult.probability);
    };

    if (simSalary) simSalary.addEventListener('input', handleSimChange);
    if (simOT) simOT.addEventListener('change', handleSimChange);
    if (simWLB) simWLB.addEventListener('change', handleSimChange);
    if (simPromo) simPromo.addEventListener('change', handleSimChange);
  }

  function updateSimulatorBaseline(currentProb) {
    const baseDisplay = document.getElementById('sim-current-prob');
    if (baseDisplay) baseDisplay.textContent = `${currentProb}%`;
    const newDisplay = document.getElementById('sim-projected-prob');
    if (newDisplay) newDisplay.textContent = `${currentProb}%`;
    const deltaDisplay = document.getElementById('sim-delta-badge');
    if (deltaDisplay) {
      deltaDisplay.textContent = `0% change`;
      deltaDisplay.style.background = 'rgba(255, 255, 255, 0.08)';
      deltaDisplay.style.color = '#cbd5e1';
    }

    // Reset controls
    const simSalary = document.getElementById('sim-salary-boost');
    if (simSalary) simSalary.value = 0;
    const simSalLbl = document.getElementById('sim-salary-val');
    if (simSalLbl) simSalLbl.textContent = '+0%';
    const simOT = document.getElementById('sim-eliminate-ot');
    if (simOT) simOT.checked = false;
    const simWLB = document.getElementById('sim-wlb-boost');
    if (simWLB) simWLB.checked = false;
    const simPromo = document.getElementById('sim-promote');
    if (simPromo) simPromo.checked = false;
  }

  function renderSimulatorOutcome(baseProb, newProb) {
    const newDisplay = document.getElementById('sim-projected-prob');
    if (newDisplay) newDisplay.textContent = `${newProb}%`;

    const delta = newProb - baseProb;
    const deltaDisplay = document.getElementById('sim-delta-badge');
    if (deltaDisplay) {
      if (delta < 0) {
        deltaDisplay.textContent = `▼ ${Math.abs(delta)}% Risk Reduction`;
        deltaDisplay.style.background = 'rgba(16, 185, 129, 0.25)';
        deltaDisplay.style.color = '#34d399';
      } else if (delta > 0) {
        deltaDisplay.textContent = `▲ +${delta}% Risk Increase`;
        deltaDisplay.style.background = 'rgba(239, 68, 68, 0.25)';
        deltaDisplay.style.color = '#f87171';
      } else {
        deltaDisplay.textContent = `0% change`;
        deltaDisplay.style.background = 'rgba(255, 255, 255, 0.08)';
        deltaDisplay.style.color = '#cbd5e1';
      }
    }
  }

  // --- Executive Dashboard Charts ---
  function initCharts() {
    if (!window.Chart) return;

    // Chart default settings for dark theme
    Chart.defaults.color = '#cbd5e1';
    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.95)';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.15)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;

    // Chart 1: Attrition by Department
    const deptCtx = document.getElementById('deptAttritionChart')?.getContext('2d');
    if (deptCtx) {
      state.charts.deptChart = new Chart(deptCtx, {
        type: 'bar',
        data: {
          labels: HR_DATA.overviewStats.byDepartment.labels,
          datasets: [
            {
              label: 'Attrition Rate (%)',
              data: HR_DATA.overviewStats.byDepartment.attritionRates,
              backgroundColor: ['#6366f1', '#06b6d4', '#c084fc'],
              borderRadius: 8
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 25,
              grid: { color: 'rgba(255, 255, 255, 0.08)' },
              ticks: { color: '#cbd5e1', font: { weight: 600 }, callback: v => v + '%' }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#ffffff', font: { weight: 600 } }
            }
          }
        }
      });
    }

    // Chart 2: Overtime vs Attrition (Doughnut)
    const otCtx = document.getElementById('overtimeChart')?.getContext('2d');
    if (otCtx) {
      state.charts.otChart = new Chart(otCtx, {
        type: 'doughnut',
        data: {
          labels: HR_DATA.overviewStats.overtimeComparison.labels,
          datasets: [
            {
              data: HR_DATA.overviewStats.overtimeComparison.attritionRate,
              backgroundColor: ['#f43f5e', '#10b981'],
              borderWidth: 2,
              borderColor: '#0f172a',
              hoverOffset: 8
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#ffffff', boxWidth: 14, padding: 16, font: { weight: 600 } }
            },
            tooltip: {
              callbacks: {
                label: ctx => ` ${ctx.label}: ${ctx.raw}% Attrition Rate`
              }
            }
          }
        }
      });
    }

    // Chart 3: Attrition Risk by Job Role
    const roleCtx = document.getElementById('roleRiskChart')?.getContext('2d');
    if (roleCtx) {
      state.charts.roleChart = new Chart(roleCtx, {
        type: 'bar',
        data: {
          labels: HR_DATA.overviewStats.jobRoleRisk.labels,
          datasets: [
            {
              label: 'Flight Risk (%)',
              data: HR_DATA.overviewStats.jobRoleRisk.riskRate,
              backgroundColor: HR_DATA.overviewStats.jobRoleRisk.riskRate.map(r => 
                r > 30 ? '#ef4444' : (r > 20 ? '#f97316' : (r > 15 ? '#f59e0b' : '#10b981'))
              ),
              borderRadius: 6
            }
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: 'rgba(255, 255, 255, 0.08)' },
              ticks: { color: '#cbd5e1', font: { weight: 600 }, callback: v => v + '%' }
            },
            y: {
              grid: { display: false },
              ticks: { color: '#ffffff', font: { weight: 600, size: 11 } }
            }
          }
        }
      });
    }

    // Chart 4: Machine Learning Feature Importance
    const featCtx = document.getElementById('featureImportanceChart')?.getContext('2d');
    if (featCtx) {
      const featLabels = HR_DATA.overviewStats.featureImportance.map(f => f.feature);
      const featValues = HR_DATA.overviewStats.featureImportance.map(f => Math.round(f.importance * 100));

      state.charts.featChart = new Chart(featCtx, {
        type: 'bar',
        data: {
          labels: featLabels,
          datasets: [
            {
              label: 'Predictive Weight (%)',
              data: featValues,
              backgroundColor: '#818cf8',
              borderRadius: 6
            }
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: 'rgba(255, 255, 255, 0.08)' },
              ticks: { color: '#cbd5e1', font: { weight: 600 }, callback: v => v + '%' }
            },
            y: {
              grid: { display: false },
              ticks: { color: '#ffffff', font: { weight: 600, size: 11 } }
            }
          }
        }
      });
    }
  }

  // --- Workforce Table Filters & Sorting ---
  function initTableFilters() {
    const searchInput = document.getElementById('table-search');
    const deptFilter = document.getElementById('filter-dept');
    const riskFilter = document.getElementById('filter-risk');
    const otFilter = document.getElementById('filter-ot');

    const applyFilters = () => {
      const query = (searchInput?.value || '').toLowerCase().trim();
      const dept = deptFilter?.value || 'all';
      const risk = riskFilter?.value || 'all';
      const ot = otFilter?.value || 'all';

      state.filteredEmployees = state.employees.filter(emp => {
        const matchesQuery = !query || 
          emp.name.toLowerCase().includes(query) ||
          emp.id.toLowerCase().includes(query) ||
          emp.role.toLowerCase().includes(query);

        const matchesDept = dept === 'all' || emp.dept === dept;
        const matchesRisk = risk === 'all' || emp.prediction.badgeClass === risk;
        const matchesOT = ot === 'all' || emp.overTime === ot;

        return matchesQuery && matchesDept && matchesRisk && matchesOT;
      });

      sortAndRenderTable();
    };

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (deptFilter) deptFilter.addEventListener('change', applyFilters);
    if (riskFilter) riskFilter.addEventListener('change', applyFilters);
    if (otFilter) otFilter.addEventListener('change', applyFilters);
  }

  function initTableSorting() {
    const sortHeaders = document.querySelectorAll('th.sortable');
    sortHeaders.forEach(th => {
      th.addEventListener('click', () => {
        const column = th.getAttribute('data-sort');
        if (state.sortColumn === column) {
          state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortColumn = column;
          state.sortDirection = column === 'income' || column === 'risk' ? 'desc' : 'asc';
        }

        // Reset sort icons
        document.querySelectorAll('.sort-icon').forEach(icon => {
          icon.textContent = '↕';
          icon.style.opacity = '0.5';
        });

        const activeIcon = document.getElementById(`sort-icon-${column}`);
        if (activeIcon) {
          activeIcon.textContent = state.sortDirection === 'asc' ? '▲' : '▼';
          activeIcon.style.opacity = '1';
        }

        sortAndRenderTable();
        showToast(`Sorted table by ${column} (${state.sortDirection.toUpperCase()})`, 'success');
      });
    });
  }

  function sortAndRenderTable() {
    const col = state.sortColumn;
    const dir = state.sortDirection === 'asc' ? 1 : -1;

    state.filteredEmployees.sort((a, b) => {
      let valA, valB;
      if (col === 'name') {
        valA = a.name; valB = b.name;
        return valA.localeCompare(valB) * dir;
      } else if (col === 'role') {
        valA = a.role; valB = b.role;
        return valA.localeCompare(valB) * dir;
      } else if (col === 'dept') {
        valA = a.dept; valB = b.dept;
        return valA.localeCompare(valB) * dir;
      } else if (col === 'income') {
        return (a.income - b.income) * dir;
      } else if (col === 'overTime') {
        return a.overTime.localeCompare(b.overTime) * dir;
      } else if (col === 'risk') {
        return (a.prediction.probability - b.prediction.probability) * dir;
      }
      return 0;
    });

    renderEmployeesTable();
  }

  function renderEmployeesTable() {
    const tbody = document.getElementById('employees-table-body');
    const countSpan = document.getElementById('table-records-count');
    if (!tbody) return;

    if (countSpan) countSpan.textContent = `${state.filteredEmployees.length} Employees`;

    if (state.filteredEmployees.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2.5rem; color: #94a3b8;">
            No employees match the active filters.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = state.filteredEmployees.map(emp => {
      const initials = emp.name.split(' ').map(n => n[0]).join('').slice(0, 2);
      const pred = emp.prediction;
      const tierShort = pred.riskTier.replace(' Risk', '').toUpperCase();

      return `
        <tr>
          <td>
            <div class="table-emp-cell">
              <div class="emp-avatar">${initials}</div>
              <div class="emp-details-text">
                <span class="emp-name">${emp.name}</span>
                <span class="emp-id">${emp.id}</span>
              </div>
            </div>
          </td>
          <td>${emp.role}</td>
          <td><span style="font-size:0.775rem; color:#cbd5e1;">${emp.dept}</span></td>
          <td>$${emp.income.toLocaleString()}/mo</td>
          <td>
            <span style="color: ${emp.overTime === 'Yes' ? '#f87171' : '#34d399'}; font-weight: 700;">
              ${emp.overTime}
            </span>
          </td>
          <td>
            <span class="risk-tag ${pred.badgeClass}">
              ● ${pred.probability}% (${tierShort})
            </span>
          </td>
          <td>
            <div class="table-actions">
              <button class="btn-table-action" onclick="window.viewEmployeeDetail('${emp.id}')" aria-label="Inspect ${emp.name}">
                Inspect
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // --- Employee Drilldown Drawer ---
  function initDrawer() {
    const backdrop = document.getElementById('drawer-backdrop');
    const closeBtn = document.getElementById('btn-close-drawer');

    const closeDrawer = () => {
      backdrop?.classList.remove('active');
      document.getElementById('employee-drawer')?.classList.remove('active');
    };

    if (backdrop) backdrop.addEventListener('click', closeDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    // Expose global helper for row click
    window.viewEmployeeDetail = (empId) => {
      const emp = state.employees.find(e => e.id === empId);
      if (!emp) return;

      state.selectedEmployee = emp;
      openDrawerWithEmployee(emp);
    };
  }

  function openDrawerWithEmployee(emp) {
    const backdrop = document.getElementById('drawer-backdrop');
    const drawer = document.getElementById('employee-drawer');
    const titleEl = document.getElementById('drawer-emp-name');
    const roleEl = document.getElementById('drawer-emp-role');
    const contentEl = document.getElementById('drawer-content');

    if (!drawer || !contentEl) return;

    if (titleEl) titleEl.textContent = emp.name;
    if (roleEl) roleEl.textContent = `${emp.role} • ${emp.dept} (${emp.id})`;

    const pred = emp.prediction;

    contentEl.innerHTML = `
      <div style="margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; background: rgba(255, 255, 255, 0.04); padding: 1.15rem; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);">
        <div>
          <div style="font-size: 0.75rem; text-transform: uppercase; color: #cbd5e1; font-weight: 700; letter-spacing:0.04em;">Predicted Flight Risk</div>
          <div style="font-size: 2.2rem; font-weight: 800; color: ${pred.riskColor}; font-family: var(--font-display); line-height:1.1;">
            ${pred.probability}%
          </div>
        </div>
        <span class="risk-badge-large ${pred.badgeClass}">
          ${pred.riskTier.toUpperCase()}
        </span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
        <div style="background: rgba(15, 23, 42, 0.75); padding: 0.95rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="font-size: 0.725rem; color: #94a3b8; text-transform:uppercase; font-weight:600;">Monthly Income</div>
          <div style="font-size: 1.15rem; font-weight: 700; color: #fff;">$${emp.income.toLocaleString()}</div>
        </div>
        <div style="background: rgba(15, 23, 42, 0.75); padding: 0.95rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="font-size: 0.725rem; color: #94a3b8; text-transform:uppercase; font-weight:600;">Overtime Required</div>
          <div style="font-size: 1.15rem; font-weight: 700; color: ${emp.overTime === 'Yes' ? '#ef4444' : '#10b981'};">${emp.overTime}</div>
        </div>
        <div style="background: rgba(15, 23, 42, 0.75); padding: 0.95rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="font-size: 0.725rem; color: #94a3b8; text-transform:uppercase; font-weight:600;">Tenure at Company</div>
          <div style="font-size: 1.15rem; font-weight: 700; color: #fff;">${emp.tenure} Years</div>
        </div>
        <div style="background: rgba(15, 23, 42, 0.75); padding: 0.95rem; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="font-size: 0.725rem; color: #94a3b8; text-transform:uppercase; font-weight:600;">Work-Life Balance</div>
          <div style="font-size: 1.15rem; font-weight: 700; color: #fff;">${emp.wlb} / 4.0</div>
        </div>
      </div>

      <h4 style="font-size: 0.85rem; text-transform: uppercase; color: #a5b4fc; margin-bottom: 0.75rem; letter-spacing: 0.06em; font-weight:700;">
        Top Flight Risk Drivers
      </h4>
      <div style="display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1.5rem;">
        ${pred.drivers.map(d => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.85rem; background: rgba(255, 255, 255, 0.04); border-radius: 6px; font-size: 0.825rem; border: 1px solid rgba(255,255,255,0.06);">
            <span>${d.name}</span>
            <span style="font-weight: 700; font-family:var(--font-mono); color: ${d.direction === 'risk' ? '#f87171' : '#34d399'};">
              ${d.direction === 'risk' ? '+' : ''}${d.impact}%
            </span>
          </div>
        `).join('')}
      </div>

      <h4 style="font-size: 0.85rem; text-transform: uppercase; color: #a5b4fc; margin-bottom: 0.75rem; letter-spacing: 0.06em; font-weight:700;">
        Prescriptive Retention Recommendations
      </h4>
      <ul style="list-style: none; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.825rem; margin-bottom: 2rem;">
        ${pred.recommendations.map(r => `
          <li style="display: flex; gap: 0.5rem; color: #f1f5f9;">
            <span style="color: #06b6d4; font-weight: bold;">✔</span> ${r}
          </li>
        `).join('')}
      </ul>

      <button class="btn-predict" onclick="window.loadEmployeeIntoPredictor('${emp.id}')">
        Load into Predictor & Simulator
      </button>
    `;

    backdrop.classList.add('active');
    drawer.classList.add('active');
  }

  window.loadEmployeeIntoPredictor = (empId) => {
    const emp = state.employees.find(e => e.id === empId);
    if (!emp) return;

    // Switch tab to predictor
    switchTab('predictor');
    // Close drawer
    document.getElementById('drawer-backdrop')?.classList.remove('active');
    document.getElementById('employee-drawer')?.classList.remove('active');

    // Populate form
    setInputValue('department', emp.dept);
    updateJobRolesForDepartment(emp.dept, emp.role);
    setInputValue('age', emp.age);
    setInputValue('monthlyIncome', emp.income, '$' + emp.income.toLocaleString());
    setInputValue('jobSatisfaction', emp.jobSat);
    setInputValue('environmentSatisfaction', emp.envSat);
    setInputValue('workLifeBalance', emp.wlb);
    setInputValue('yearsAtCompany', emp.tenure, emp.tenure + ' yrs');
    const otCheck = document.getElementById('overTime');
    if (otCheck) otCheck.checked = emp.overTime === 'Yes';

    runLivePrediction();
    showToast(`Loaded ${emp.name} into Predictor & Simulator`, 'success');
  };

  // --- Batch CSV Analyzer & Scorer ---
  function initBatchUploader() {
    const dropzone = document.getElementById('csv-dropzone');
    const fileInput = document.getElementById('csv-file-input');
    const sampleBtn = document.getElementById('btn-load-sample-csv');
    const downloadBtn = document.getElementById('btn-download-scored-csv');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
          handleCsvFile(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
          handleCsvFile(e.target.files[0]);
        }
      });
    }

    if (sampleBtn) {
      sampleBtn.addEventListener('click', () => {
        generateAndScoreBenchmarkBatch();
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', exportScoredCSV);
    }
  }

  function handleCsvFile(file) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showToast('Please upload a valid .csv file format', 'danger');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const rows = parseCSVText(text);
        if (rows.length === 0) {
          showToast('CSV file is empty or could not be parsed', 'warning');
          return;
        }
        scoreBatchRecords(rows, file.name);
      } catch (err) {
        showToast('Error parsing CSV file: ' + err.message, 'danger');
      }
    };
    reader.readAsText(file);
  }

  function parseCSVText(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = parts[idx] || '';
      });
      rows.push(obj);
    }
    return rows;
  }

  function generateAndScoreBenchmarkBatch() {
    // Generate realistic 1,470 calibrated IBM benchmark records
    const depts = ['Research & Development', 'Sales', 'Human Resources'];
    const rolesByDept = DEPARTMENT_ROLES;
    const benchmarkRows = [];

    for (let i = 1; i <= 1470; i++) {
      const dept = depts[i % 3 === 0 ? 1 : (i % 20 === 0 ? 2 : 0)];
      const roles = rolesByDept[dept];
      const role = roles[i % roles.length];
      const isOT = (i % 3 === 0);
      const age = 22 + (i % 40);
      const tenure = 1 + (i % 18);
      const income = Math.round(2800 + (tenure * 450) + ((i % 15) * 350));
      const jobSat = (i % 4) + 1;
      const envSat = ((i + 1) % 4) + 1;
      const wlb = ((i + 2) % 4) + 1;

      benchmarkRows.push({
        id: `IBM-${1000 + i}`,
        age,
        department: dept,
        jobRole: role,
        monthlyIncome: income,
        overTime: isOT ? 'Yes' : 'No',
        jobSatisfaction: jobSat,
        environmentSatisfaction: envSat,
        workLifeBalance: wlb,
        yearsAtCompany: tenure,
        yearsSinceLastPromotion: Math.floor(tenure * 0.4),
        yearsWithCurrManager: Math.floor(tenure * 0.6),
        stockOptionLevel: income > 8000 ? 1 : 0,
        businessTravel: i % 5 === 0 ? 'Travel_Frequently' : 'Travel_Rarely'
      });
    }

    scoreBatchRecords(benchmarkRows, 'IBM HR Analytics Benchmark');
  }

  function scoreBatchRecords(records, sourceName) {
    const statusBox = document.getElementById('batch-processing-status');
    const progressBar = document.getElementById('batch-progress-bar');
    const statsContainer = document.getElementById('batch-results-stats');

    if (statusBox) statusBox.style.display = 'block';

    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      if (progressBar) progressBar.style.width = `${progress}%`;

      if (progress >= 100) {
        clearInterval(interval);

        // Run ML inference on all records
        let countLow = 0, countMod = 0, countHigh = 0, countCrit = 0;
        let totalCost = 0;

        const scored = records.map((rec, index) => {
          const pred = MLEngine.predict({
            age: Number(rec.age || rec.Age) || 30,
            department: rec.department || rec.Department || 'Research & Development',
            jobRole: rec.jobRole || rec.JobRole || 'Research Scientist',
            monthlyIncome: Number(rec.monthlyIncome || rec.MonthlyIncome) || 5000,
            overTime: rec.overTime || rec.OverTime || 'No',
            jobSatisfaction: Number(rec.jobSatisfaction || rec.JobSatisfaction) || 3,
            environmentSatisfaction: Number(rec.environmentSatisfaction || rec.EnvironmentSatisfaction) || 3,
            workLifeBalance: Number(rec.workLifeBalance || rec.WorkLifeBalance) || 3,
            yearsAtCompany: Number(rec.yearsAtCompany || rec.YearsAtCompany) || 3,
            yearsSinceLastPromotion: Number(rec.yearsSinceLastPromotion || rec.YearsSinceLastPromotion) || 1,
            yearsWithCurrManager: Number(rec.yearsWithCurrManager || rec.YearsWithCurrManager) || 2,
            stockOptionLevel: Number(rec.stockOptionLevel || rec.StockOptionLevel) || 0,
            businessTravel: rec.businessTravel || rec.BusinessTravel || 'Travel_Rarely'
          });

          if (pred.probability >= 75) countCrit++;
          else if (pred.probability >= 50) countHigh++;
          else if (pred.probability >= 25) countMod++;
          else countLow++;

          totalCost += pred.estimatedRetentionCost;

          return {
            id: rec.id || `REC-${index + 1}`,
            age: rec.age || rec.Age || 30,
            department: rec.department || rec.Department || 'R&D',
            jobRole: rec.jobRole || rec.JobRole || 'Scientist',
            income: Number(rec.monthlyIncome || rec.MonthlyIncome) || 5000,
            overTime: rec.overTime || rec.OverTime || 'No',
            prediction: pred
          };
        });

        state.batchScoredRecords = scored;

        setTimeout(() => {
          if (statusBox) statusBox.style.display = 'none';
          if (statsContainer) statsContainer.style.display = 'block';

          // Update KPI Summary
          const total = scored.length;
          const atRisk = countHigh + countCrit;
          const atRiskPct = ((atRisk / total) * 100).toFixed(1);
          const retainedEst = Math.round(atRisk * 0.71);

          document.getElementById('batch-count-val').textContent = total.toLocaleString();
          document.getElementById('batch-risk-val').textContent = `${atRisk.toLocaleString()} (${atRiskPct}%)`;
          document.getElementById('batch-cost-val').textContent = `$${(totalCost / 1000000).toFixed(2)}M`;
          document.getElementById('batch-retained-val').textContent = `${retainedEst.toLocaleString()} (71%)`;

          // Update Distribution Bar
          const pLow = ((countLow / total) * 100).toFixed(1);
          const pMod = ((countMod / total) * 100).toFixed(1);
          const pHigh = ((countHigh / total) * 100).toFixed(1);
          const pCrit = ((countCrit / total) * 100).toFixed(1);

          document.getElementById('dist-bar-low').style.width = `${pLow}%`;
          document.getElementById('dist-bar-mod').style.width = `${pMod}%`;
          document.getElementById('dist-bar-high').style.width = `${pHigh}%`;
          document.getElementById('dist-bar-crit').style.width = `${pCrit}%`;

          document.getElementById('dist-count-low').textContent = `${countLow.toLocaleString()} (${pLow}%)`;
          document.getElementById('dist-count-mod').textContent = `${countMod.toLocaleString()} (${pMod}%)`;
          document.getElementById('dist-count-high').textContent = `${countHigh.toLocaleString()} (${pHigh}%)`;
          document.getElementById('dist-count-crit').textContent = `${countCrit.toLocaleString()} (${pCrit}%)`;

          // Render First 10 Scored Rows
          const tbody = document.getElementById('batch-table-body');
          if (tbody) {
            tbody.innerHTML = scored.slice(0, 10).map(row => `
              <tr>
                <td><strong style="color:#fff;">${row.id}</strong></td>
                <td>${row.age}</td>
                <td><span style="font-size:0.775rem; color:#cbd5e1;">${row.department}</span></td>
                <td>${row.jobRole}</td>
                <td>$${row.income.toLocaleString()}/mo</td>
                <td><span style="color:${row.overTime === 'Yes' ? '#f87171' : '#34d399'}; font-weight:700;">${row.overTime}</span></td>
                <td><strong style="color:${row.prediction.riskColor};">${row.prediction.probability}%</strong></td>
                <td><span class="risk-tag ${row.prediction.badgeClass}">${row.prediction.riskTier.replace(' Risk', '').toUpperCase()}</span></td>
                <td style="font-size:0.775rem;">${row.prediction.drivers[0]?.name || 'Standard Retention'}</td>
              </tr>
            `).join('');
          }

          showToast(`Successfully analyzed ${total.toLocaleString()} records from ${sourceName}!`, 'success');
        }, 250);
      }
    }, 100);
  }

  function exportScoredCSV() {
    if (!state.batchScoredRecords || state.batchScoredRecords.length === 0) {
      showToast('No batch records to export. Load dataset first.', 'warning');
      return;
    }

    const headers = [
      'Record_ID',
      'Age',
      'Department',
      'Job_Role',
      'Monthly_Income',
      'Overtime',
      'Predicted_Risk_Probability_Pct',
      'Risk_Tier',
      'Top_Flight_Driver',
      'Prescribed_Retention_Action'
    ];

    const rows = state.batchScoredRecords.map(r => [
      `"${r.id}"`,
      r.age,
      `"${r.department}"`,
      `"${r.jobRole}"`,
      r.income,
      `"${r.overTime}"`,
      r.prediction.probability,
      `"${r.prediction.riskTier}"`,
      `"${r.prediction.drivers[0]?.name || 'N/A'}"`,
      `"${r.prediction.recommendations[0]?.replace(/"/g, '""') || 'N/A'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'RetainAI_Scored_Workforce_Attrition_Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Downloaded enriched workforce attrition CSV report!', 'success');
  }

  // --- Toast Utility ---
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✔' : '⚠'}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
});
