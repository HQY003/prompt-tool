(function () {
  'use strict';

  const state = {
    categoryId: null,
    scenarioId: null,
    variableValues: {},
    searchQuery: ''
  };

  const $ = (sel) => document.querySelector(sel);

  const categoryList = $('#categoryList');
  const scenarioGrid = $('#scenarioGrid');
  const categoryTitle = $('#categoryTitle');
  const categoryDesc = $('#categoryDesc');
  const promptEmpty = $('#promptEmpty');
  const promptContent = $('#promptContent');
  const promptTitle = $('#promptTitle');
  const promptDesc = $('#promptDesc');
  const promptTags = $('#promptTags');
  const variablesGrid = $('#variablesGrid');
  const variablesSection = $('#variablesSection');
  const promptPreview = $('#promptPreview');
  const followupsSection = $('#followupsSection');
  const followupsList = $('#followupsList');
  const copyBtn = $('#copyBtn');
  const copyBtnText = $('#copyBtnText');
  const resetVarsBtn = $('#resetVarsBtn');
  const searchInput = $('#searchInput');
  const toast = $('#toast');
  const statsText = $('#statsText');

  function getTotalStats() {
    const cats = PROMPT_LIBRARY.categories;
    const scenarios = cats.reduce((n, c) => n + c.scenarios.length, 0);
    return { categories: cats.length, scenarios };
  }

  function renderStats() {
    const { categories, scenarios } = getTotalStats();
    statsText.textContent = `${categories} 大分类 · ${scenarios} 个场景`;
  }

  function getCategory(id) {
    return PROMPT_LIBRARY.categories.find((c) => c.id === id);
  }

  function getScenario(categoryId, scenarioId) {
    const cat = getCategory(categoryId);
    return cat?.scenarios.find((s) => s.id === scenarioId);
  }

  function renderCategories() {
    categoryList.innerHTML = PROMPT_LIBRARY.categories
      .map(
        (cat) => `
      <button class="category-btn ${state.categoryId === cat.id ? 'active' : ''}"
              data-category="${cat.id}">
        <span class="icon">${cat.icon}</span>
        <span>${cat.name}</span>
        <span class="count">${cat.scenarios.length}</span>
      </button>
    `
      )
      .join('');

    categoryList.querySelectorAll('.category-btn').forEach((btn) => {
      btn.addEventListener('click', () => selectCategory(btn.dataset.category));
    });
  }

  function renderScenarios(scenarios) {
    if (!scenarios.length) {
      scenarioGrid.innerHTML = '<div class="no-results">未找到匹配的场景</div>';
      return;
    }

    scenarioGrid.innerHTML = scenarios
      .map(
        (s) => `
      <div class="scenario-card ${state.scenarioId === s.id ? 'active' : ''}"
           data-scenario="${s.id}">
        <h3>${escapeHtml(s.title)}</h3>
        <p>${escapeHtml(s.description)}</p>
        <div class="card-tags">
          ${s.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
    `
      )
      .join('');

    scenarioGrid.querySelectorAll('.scenario-card').forEach((card) => {
      card.addEventListener('click', () => selectScenario(card.dataset.scenario));
    });
  }

  function filterScenarios(category, query) {
    if (!query.trim()) return category.scenarios;

    const q = query.toLowerCase();
    return category.scenarios.filter((s) => {
      const followUpText = (s.followUps || []).map((f) => f.question).join(' ');
      const haystack = [s.title, s.description, ...s.tags, s.prompt, followUpText].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  function selectCategory(categoryId) {
    state.categoryId = categoryId;
    state.scenarioId = null;
    state.variableValues = {};

    const cat = getCategory(categoryId);
    categoryTitle.textContent = `${cat.icon} ${cat.name}`;
    categoryDesc.textContent = cat.description;

    renderCategories();
    renderScenarios(filterScenarios(cat, state.searchQuery));
    showEmptyPrompt();
  }

  function selectScenario(scenarioId) {
    state.scenarioId = scenarioId;
    state.variableValues = {};

    const cat = getCategory(state.categoryId);
    renderScenarios(filterScenarios(cat, state.searchQuery));
    renderPromptPanel();
  }

  function showEmptyPrompt() {
    promptEmpty.classList.remove('hidden');
    promptContent.classList.add('hidden');
  }

  function renderPromptPanel() {
    const scenario = getScenario(state.categoryId, state.scenarioId);
    if (!scenario) {
      showEmptyPrompt();
      return;
    }

    promptEmpty.classList.add('hidden');
    promptContent.classList.remove('hidden');

    promptTitle.textContent = scenario.title;
    promptDesc.textContent = scenario.description;
    promptTags.innerHTML = scenario.tags
      .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
      .join('');

    if (scenario.variables?.length) {
      variablesSection.classList.remove('hidden');
      variablesGrid.innerHTML = scenario.variables
        .map(
          (v) => `
        <div class="var-field">
          <label for="var-${v.key}">${escapeHtml(v.label)}</label>
          <input type="text" id="var-${v.key}" data-key="${v.key}"
                 placeholder="${escapeHtml(v.placeholder)}"
                 value="${escapeHtml(state.variableValues[v.key] || '')}">
        </div>
      `
        )
        .join('');

      variablesGrid.querySelectorAll('input').forEach((input) => {
        input.addEventListener('input', (e) => {
          state.variableValues[e.target.dataset.key] = e.target.value;
          updatePreview();
        });
      });
    } else {
      variablesSection.classList.add('hidden');
    }

    renderFollowUps(scenario);
    updatePreview();
  }

  function renderFollowUps(scenario) {
    if (!scenario.followUps?.length) {
      followupsSection.classList.add('hidden');
      followupsList.innerHTML = '';
      return;
    }

    followupsSection.classList.remove('hidden');
    followupsList.innerHTML = scenario.followUps
      .map(
        (item, index) => `
      <div class="followup-card" data-index="${index}">
        <div class="followup-meta">
          <span class="followup-tag">${escapeHtml(item.tag)}</span>
          <button class="followup-copy" type="button" data-index="${index}" title="复制追问">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            复制
          </button>
        </div>
        <p class="followup-text">${escapeHtml(item.question)}</p>
      </div>
    `
      )
      .join('');

    followupsList.querySelectorAll('.followup-copy').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = Number(btn.dataset.index);
        copyFollowUp(scenario.followUps[index].question);
      });
    });

    followupsList.querySelectorAll('.followup-card').forEach((card) => {
      card.addEventListener('click', () => {
        const index = Number(card.dataset.index);
        copyFollowUp(scenario.followUps[index].question);
      });
    });
  }

  function fillPrompt(template, variables, values) {
    let result = template;
    variables.forEach((v) => {
      const val = values[v.key]?.trim();
      const replacement = val || `【${v.label}】`;
      result = result.split(`{{${v.key}}}`).join(replacement);
    });
    return result;
  }

  function updatePreview() {
    const scenario = getScenario(state.categoryId, state.scenarioId);
    if (!scenario) return;

    const filled = fillPrompt(
      scenario.prompt,
      scenario.variables || [],
      state.variableValues
    );
    promptPreview.textContent = filled;
  }

  function resetVariables() {
    state.variableValues = {};
    variablesGrid.querySelectorAll('input').forEach((input) => {
      input.value = '';
    });
    updatePreview();
  }

  async function copyText(text, message) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(message || '已复制到剪贴板');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(message || '已复制到剪贴板');
    }
  }

  function copyPrompt() {
    copyText(promptPreview.textContent, '提示词已复制');
  }

  function copyFollowUp(text) {
    copyText(text, '追问已复制');
  }

  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 2000);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function handleSearch() {
    state.searchQuery = searchInput.value;
    if (!state.categoryId) return;

    const cat = getCategory(state.categoryId);
    const filtered = filterScenarios(cat, state.searchQuery);

    if (state.scenarioId && !filtered.find((s) => s.id === state.scenarioId)) {
      state.scenarioId = null;
      showEmptyPrompt();
    }

    renderScenarios(filtered);
  }

  function init() {
    renderStats();
    renderCategories();

    const firstCat = PROMPT_LIBRARY.categories[0];
    if (firstCat) selectCategory(firstCat.id);

    copyBtn.addEventListener('click', copyPrompt);
    resetVarsBtn.addEventListener('click', resetVariables);
    searchInput.addEventListener('input', handleSearch);
  }

  init();
})();
