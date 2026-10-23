// Monster Energy Pausen-Tracker (Cloudflare D1 Datenbank + JSON/LocalStorage Fallback)

const STORAGE_KEYS = {
    LOCAL_RATINGS: 'monsterList_localRatings_v1',
    LOCAL_MONSTERS: 'monsterList_localMonsters_v1',
    LOCAL_STATUS: 'monsterList_localStatus_v1',
    REVIEWER_NAME: 'monsterList_reviewerName_v1'
};

let appState = {
    meta: { title: 'Monster Energy Pausen-Tracker', apiUrl: '' },
    baseMonsters: [],
    d1Connected: false,
    currentView: 'tested',
    activeMonsterId: null,
    selectedScore: null
};

// Hilfsfunktionen für LocalStorage
function getLocalJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function setLocalJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// Cloudflare Worker API-URL (aus data/monsters.json -> meta.apiUrl)
function getD1ApiUrl() {
    return ((appState.meta && appState.meta.apiUrl) || '').trim().replace(/\/+$/, '');
}

// Alle Monster + Bewertungen (Cloudflare D1 oder Basis-JSON + LocalStorage) zusammenführen
function getMergedMonsters() {
    // Wenn D1 verbunden ist, kommen alle Monster & Bewertungen direkt aus der D1-Datenbank
    if (appState.d1Connected) {
        return appState.baseMonsters.map(m => ({
            ...m,
            id: Number(m.id),
            ratings: Array.isArray(m.ratings) ? [...m.ratings] : []
        }));
    }

    const localMonsters = getLocalJson(STORAGE_KEYS.LOCAL_MONSTERS, []);
    const localStatusMap = getLocalJson(STORAGE_KEYS.LOCAL_STATUS, {});
    const localRatingsMap = getLocalJson(STORAGE_KEYS.LOCAL_RATINGS, {});

    const byId = new Map();

    appState.baseMonsters.forEach(m => {
        byId.set(Number(m.id), {
            ...m,
            id: Number(m.id),
            ratings: Array.isArray(m.ratings) ? [...m.ratings] : []
        });
    });

    // Lokal hinzugefügte Monster
    localMonsters.forEach(m => {
        if (!byId.has(Number(m.id))) {
            byId.set(Number(m.id), {
                ...m,
                id: Number(m.id),
                ratings: []
            });
        }
    });

    // Status-Overrides & Bewertungen zusammenführen
    for (const [id, monster] of byId.entries()) {
        if (localStatusMap[id]) {
            monster.status = localStatusMap[id];
        }

        const localRatingsForMonster = localRatingsMap[id] || [];
        const combined = [...monster.ratings, ...localRatingsForMonster];

        // Duplikate vermeiden (gleicher Name + Score + Kommentar)
        const seen = new Set();
        monster.ratings = combined.filter(r => {
            const key = `${(r.user || '').toLowerCase().trim()}|${r.score}|${(r.comment || '').trim()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        if (monster.ratings.length > 0 && !localStatusMap[id] && monster.status === 'upcoming') {
            monster.status = 'tested';
        }
    }

    return Array.from(byId.values());
}

function calculateAverage(ratings, reviewerFilter = '') {
    const filtered = reviewerFilter
        ? ratings.filter(r => (r.user || '').toLowerCase() === reviewerFilter.toLowerCase())
        : ratings;

    if (!filtered.length) return null;
    const sum = filtered.reduce((acc, r) => acc + Number(r.score || 0), 0);
    return sum / filtered.length;
}

// Daten aus data/monsters.json laden
async function loadBaseJson() {
    try {
        const res = await fetch('data/monsters.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        appState.meta = json.meta || appState.meta;
        appState.baseMonsters = Array.isArray(json.monsters) ? json.monsters : [];
    } catch {
        appState.baseMonsters = [];
    }
}

// Live-Daten aus Cloudflare D1 Worker API laden
async function fetchD1Data(apiUrl) {
    const res = await fetch(`${apiUrl}/api/data`, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
}

async function postD1(apiUrl, path, method, body) {
    const res = await fetch(`${apiUrl}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

// Änderungen, die offline/ohne Verbindung nur lokal gespeichert wurden, nach D1 hochladen
async function uploadLocalChanges(apiUrl) {
    const localMonsters = getLocalJson(STORAGE_KEYS.LOCAL_MONSTERS, []);
    const localRatingsMap = getLocalJson(STORAGE_KEYS.LOCAL_RATINGS, {});
    const localStatusMap = getLocalJson(STORAGE_KEYS.LOCAL_STATUS, {});
    const hasPending = localMonsters.length || Object.keys(localRatingsMap).length || Object.keys(localStatusMap).length;
    if (!hasPending) return 0;

    let uploaded = 0;
    const idMap = {};

    const remainingMonsters = [];
    for (const m of localMonsters) {
        try {
            const data = await postD1(apiUrl, '/api/monsters', 'POST', m);
            if (data.id) idMap[m.id] = data.id;
            uploaded++;
        } catch {
            remainingMonsters.push(m);
        }
    }

    const remainingRatings = {};
    for (const [id, ratings] of Object.entries(localRatingsMap)) {
        for (const r of ratings) {
            try {
                await postD1(apiUrl, '/api/ratings', 'POST', { ...r, monsterId: Number(idMap[id] || id) });
                uploaded++;
            } catch {
                (remainingRatings[id] = remainingRatings[id] || []).push(r);
            }
        }
    }

    const remainingStatus = {};
    for (const [id, status] of Object.entries(localStatusMap)) {
        try {
            await postD1(apiUrl, '/api/monsters/status', 'PATCH', { monsterId: Number(idMap[id] || id), status });
            uploaded++;
        } catch {
            remainingStatus[id] = status;
        }
    }

    setLocalJson(STORAGE_KEYS.LOCAL_MONSTERS, remainingMonsters);
    setLocalJson(STORAGE_KEYS.LOCAL_RATINGS, remainingRatings);
    setLocalJson(STORAGE_KEYS.LOCAL_STATUS, remainingStatus);
    return uploaded;
}

async function syncFromCloudflareD1() {
    const statusText = document.getElementById('syncStatusText');
    const statusDot = document.getElementById('syncStatusDot');
    const feedback = document.getElementById('repoSyncFeedback');

    // Früher manuell eingetragene URL aufräumen (wird nicht mehr verwendet)
    localStorage.removeItem('monsterList_d1ApiUrl_v1');
    const apiUrl = getD1ApiUrl();

    if (!apiUrl) {
        appState.d1Connected = false;
        statusText.textContent = 'D1 nicht konfiguriert';
        if (statusDot) statusDot.style.background = '#ffb703';
        if (feedback) {
            feedback.textContent = 'In data/monsters.json ist keine apiUrl hinterlegt. Den Deploy-Workflow ausführen!';
        }
        return;
    }

    try {
        let data = await fetchD1Data(apiUrl);

        const uploaded = await uploadLocalChanges(apiUrl);
        if (uploaded > 0) {
            data = await fetchD1Data(apiUrl);
            showToast(`☁️ ${uploaded} lokal gespeicherte Änderung(en) nach D1 hochgeladen.`);
        }

        if (Array.isArray(data.monsters) && data.monsters.length > 0) {
            appState.baseMonsters = data.monsters;
        }
        appState.d1Connected = true;
        statusText.textContent = 'D1 Live aktiv';
        if (statusDot) statusDot.style.background = '#00ff41';
        if (feedback) {
            feedback.textContent = `✅ Verbunden mit Cloudflare D1 (${appState.baseMonsters.length} Monster geladen).`;
        }
    } catch (err) {
        appState.d1Connected = false;
        statusText.textContent = 'D1 Fehler';
        if (statusDot) statusDot.style.background = '#ff4d4d';
        if (feedback) {
            feedback.textContent = `❌ Verbindung zu "${apiUrl}" fehlgeschlagen: ${err.message}`;
        }
    }
}

// Kategorien & Kollegen-Dropdowns aktualisieren
function populateFilters(monsters) {
    const categoryFilter = document.getElementById('categoryFilter');
    const currentCat = categoryFilter.value;
    const categories = Array.from(new Set(monsters.map(m => m.category).filter(Boolean))).sort();

    categoryFilter.innerHTML = '<option value="">Alle Kategorien</option>';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        categoryFilter.appendChild(opt);
    });
    categoryFilter.value = currentCat;

    // Kollegen-Filter für Bestenliste
    const reviewerFilter = document.getElementById('reviewerFilter');
    const currentRev = reviewerFilter.value;
    const reviewers = new Set();
    monsters.forEach(m => m.ratings.forEach(r => {
        if (r.user) reviewers.add(r.user.trim());
    }));

    reviewerFilter.innerHTML = '<option value="">Alle Kollegen (Gesamtdurchschnitt)</option>';
    Array.from(reviewers).sort().forEach(user => {
        const opt = document.createElement('option');
        opt.value = user;
        opt.textContent = `Bewertungen von ${user}`;
        reviewerFilter.appendChild(opt);
    });
    reviewerFilter.value = currentRev;

    // Bilder-Vorschlagsliste im "Neues Monster"-Modal
    const datalist = document.getElementById('existingImagesList');
    if (datalist) {
        datalist.innerHTML = '';
        monsters.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.image;
            opt.label = m.name;
            datalist.appendChild(opt);
        });
    }
}

// Obere Statistik-Karten & Tab-Zähler aktualisieren
function renderSummaryAndCounts(monsters) {
    const tested = monsters.filter(m => m.status === 'tested');
    const upcoming = monsters.filter(m => m.status === 'upcoming');
    const totalRatings = monsters.reduce((sum, m) => sum + m.ratings.length, 0);

    document.getElementById('statTestedCount').textContent = tested.length;
    document.getElementById('statUpcomingCount').textContent = upcoming.length;
    document.getElementById('statTotalRatings').textContent = totalRatings;

    document.getElementById('pillTested').textContent = tested.length;
    document.getElementById('pillUpcoming').textContent = upcoming.length;
    document.getElementById('pillAll').textContent = monsters.length;

    // Bestes Monster ermitteln
    const ratedMonsters = monsters
        .map(m => ({ monster: m, avg: calculateAverage(m.ratings) }))
        .filter(item => item.avg !== null)
        .sort((a, b) => b.avg - a.avg || b.monster.ratings.length - a.monster.ratings.length);

    const topEl = document.getElementById('statTopMonster');
    if (ratedMonsters.length > 0) {
        const best = ratedMonsters[0];
        topEl.textContent = `${best.monster.name} (${best.avg.toFixed(1)}/10)`;
    } else {
        topEl.textContent = 'Noch keine Stimmen';
    }
}

// Haupt-Grid rendern
function renderCatalog(monsters) {
    const grid = document.getElementById('monstersGrid');
    const banner = document.getElementById('sectionBanner');
    const search = document.getElementById('searchInput').value.toLowerCase().trim();
    const category = document.getElementById('categoryFilter').value;
    const sugarMode = document.getElementById('sugarFilter').value;
    const sortBy = document.getElementById('sortSelect').value;

    if (appState.currentView === 'tested') {
        banner.innerHTML = '<strong>✅ Schon getestet:</strong> Diese Monster hatten wir bereits in der Pause. Klicke auf eine Dose, um die Bewertungen der Kollegen zu sehen oder selbst abzustimmen!';
    } else if (appState.currentView === 'upcoming') {
        banner.innerHTML = '<strong>⏳ Demnächst dran:</strong> Diese Sorten stehen noch auf unserer Pausen-Liste. Sobald wir eine Dose testen, einfach anklicken und bewerten!';
    } else {
        banner.innerHTML = '<strong>📦 Alle Sorten:</strong> Komplette Übersicht über alle 31+ Monster Energy Dosen in unserer Liste.';
    }

    let filtered = monsters.filter(m => {
        if (appState.currentView === 'tested' && m.status !== 'tested') return false;
        if (appState.currentView === 'upcoming' && m.status !== 'upcoming') return false;
        if (category && m.category !== category) return false;
        if (sugarMode === 'zero' && Number(m.sugar) > 0) return false;
        if (sugarMode === 'sugar' && Number(m.sugar) === 0) return false;

        if (search) {
            const hay = `${m.name} ${m.taste || ''} ${m.category || ''}`.toLowerCase();
            if (!hay.includes(search)) return false;
        }
        return true;
    });

    filtered.sort((a, b) => {
        const avgA = calculateAverage(a.ratings) ?? -1;
        const avgB = calculateAverage(b.ratings) ?? -1;

        switch (sortBy) {
            case 'rating-desc':
                return avgB - avgA || b.ratings.length - a.ratings.length || a.name.localeCompare(b.name);
            case 'reviews-desc':
                return b.ratings.length - a.ratings.length || avgB - avgA;
            case 'sugar-asc':
                return Number(a.sugar) - Number(b.sugar) || a.name.localeCompare(b.name);
            case 'caffeine-desc':
                return Number(b.caffeine) - Number(a.caffeine) || a.name.localeCompare(b.name);
            case 'name-asc':
            default:
                return a.name.localeCompare(b.name);
        }
    });

    grid.innerHTML = '';

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="section-banner" style="grid-column: 1 / -1;">Keine Monster für diesen Filter gefunden.</div>`;
        return;
    }

    filtered.forEach(monster => {
        const avg = calculateAverage(monster.ratings);
        const card = document.createElement('article');
        card.className = `monster-card ${monster.status === 'upcoming' ? 'upcoming-card' : ''}`;
        card.tabIndex = 0;

        const recentChips = monster.ratings.slice(-4).map(r =>
            `<span class="reviewer-chip">${escapeHtml(r.user)}: <strong>${r.score}/10</strong></span>`
        ).join('');

        card.innerHTML = `
            <div>
                <div class="card-top-row">
                    <span class="status-badge ${monster.status}">
                        ${monster.status === 'tested' ? '✅ Getestet' : '⏳ Demnächst'}
                    </span>
                    <span class="category-badge">${escapeHtml(monster.category || 'Monster')}</span>
                </div>
                <div class="card-image-wrap">
                    <img src="${escapeHtml(monster.image)}" alt="${escapeHtml(monster.name)}" loading="lazy" onerror="this.src='res/OriginalGreenMonsterEnergy.webp'">
                </div>
                <h3>${escapeHtml(monster.name)}</h3>
                <p class="taste-preview">${escapeHtml(monster.taste || 'Keine Geschmacksbeschreibung')}</p>
                <div class="nutri-pills">
                    <span class="nutri-pill ${Number(monster.sugar) === 0 ? 'zero-sugar' : ''}">
                        🍬 ${Number(monster.sugar) === 0 ? 'Zero Sugar (0g)' : `${monster.sugar}g Zucker`}
                    </span>
                    <span class="nutri-pill">⚡ ${monster.caffeine}mg Koffein</span>
                </div>
            </div>
            <div>
                <div class="card-rating-footer">
                    <div class="score-pill">
                        ${avg !== null ? `★ ${avg.toFixed(1)} <small>/ 10</small>` : `<small>Noch keine Bewertung</small>`}
                    </div>
                    <span class="small-text">${monster.ratings.length} ${monster.ratings.length === 1 ? 'Stimme' : 'Stimmen'}</span>
                </div>
                ${recentChips ? `<div class="reviewer-chips">${recentChips}</div>` : ''}
            </div>
        `;

        card.addEventListener('click', () => openMonsterModal(monster.id));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openMonsterModal(monster.id);
            }
        });

        grid.appendChild(card);
    });
}

// Bestenliste / Ranking-Ansicht rendern
function renderRanking(monsters) {
    const reviewerFilter = document.getElementById('reviewerFilter').value;
    const podiumContainer = document.getElementById('podiumContainer');
    const listContainer = document.getElementById('rankingTableContainer');

    const ranked = monsters
        .map(m => {
            const relevantRatings = reviewerFilter
                ? m.ratings.filter(r => (r.user || '').toLowerCase() === reviewerFilter.toLowerCase())
                : m.ratings;
            return {
                monster: m,
                avg: calculateAverage(m.ratings, reviewerFilter),
                count: relevantRatings.length,
                ratings: relevantRatings
            };
        })
        .filter(item => item.avg !== null)
        .sort((a, b) => b.avg - a.avg || b.count - a.count || a.monster.name.localeCompare(b.monster.name));

    podiumContainer.innerHTML = '';
    listContainer.innerHTML = '';

    if (ranked.length === 0) {
        listContainer.innerHTML = `
            <div class="section-banner">
                Noch keine Bewertungen vorhanden${reviewerFilter ? ` für <strong>${escapeHtml(reviewerFilter)}</strong>` : ''}.
                Klicke in der Übersicht auf ein Monster, um die erste Bewertung abzugeben!
            </div>
        `;
        return;
    }

    const medals = ['🥇 Platz 1', '🥈 Platz 2', '🥉 Platz 3'];
    ranked.slice(0, 3).forEach((item, idx) => {
        const podium = document.createElement('div');
        podium.className = `podium-card rank-${idx + 1}`;
        podium.innerHTML = `
            <div class="podium-medal">${medals[idx]}</div>
            <img src="${escapeHtml(item.monster.image)}" alt="${escapeHtml(item.monster.name)}">
            <h3>${escapeHtml(item.monster.name)}</h3>
            <p class="small-text">${escapeHtml(item.monster.taste || '')}</p>
            <div class="score-pill" style="justify-content:center; margin-top:8px;">
                ★ ${item.avg.toFixed(1)} <small>/ 10 (${item.count} ${item.count === 1 ? 'Stimme' : 'Stimmen'})</small>
            </div>
        `;
        podium.addEventListener('click', () => openMonsterModal(item.monster.id));
        podiumContainer.appendChild(podium);
    });

    ranked.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'ranking-row';
        const summaryQuotes = item.ratings
            .map(r => `${escapeHtml(r.user)} (${r.score}/10)${r.comment ? `: „${escapeHtml(r.comment)}“` : ''}`)
            .join(' • ');

        row.innerHTML = `
            <div class="rank-num">#${idx + 1}</div>
            <img src="${escapeHtml(item.monster.image)}" alt="${escapeHtml(item.monster.name)}">
            <div class="ranking-row-info">
                <strong>${escapeHtml(item.monster.name)}</strong>
                <div class="small-text">${summaryQuotes}</div>
            </div>
            <div class="ranking-row-score">
                ★ ${item.avg.toFixed(1)} <span class="small-text">/ 10</span>
            </div>
        `;
        row.addEventListener('click', () => openMonsterModal(item.monster.id));
        listContainer.appendChild(row);
    });
}

// Gesamt-UI neu zeichnen
function refreshUI() {
    const monsters = getMergedMonsters();
    populateFilters(monsters);
    renderSummaryAndCounts(monsters);
    renderCatalog(monsters);
    renderRanking(monsters);
    updateJsonExportPreview();

    if (appState.activeMonsterId !== null) {
        openMonsterModal(appState.activeMonsterId);
    }
}

// Detail- & Bewertungs-Modal öffnen
function openMonsterModal(monsterId) {
    const monsters = getMergedMonsters();
    const monster = monsters.find(m => m.id === Number(monsterId));
    if (!monster) return;

    appState.activeMonsterId = monster.id;

    document.getElementById('modalMonsterImg').src = monster.image;
    document.getElementById('modalMonsterImg').alt = monster.name;
    document.getElementById('modalMonsterTitle').textContent = monster.name;
    document.getElementById('modalMonsterTaste').textContent = monster.taste || '';
    document.getElementById('modalMonsterSugar').textContent = `${monster.sugar}g`;
    document.getElementById('modalMonsterCaffeine').textContent = `${monster.caffeine}mg`;

    const statusBadge = document.getElementById('modalStatusBadge');
    statusBadge.className = `status-badge ${monster.status}`;
    statusBadge.textContent = monster.status === 'tested' ? '✅ Schon getestet' : '⏳ Demnächst';

    document.getElementById('modalCategoryBadge').textContent = monster.category || 'Monster';
    document.getElementById('modalStatusSelect').value = monster.status;

    const avg = calculateAverage(monster.ratings);
    document.getElementById('modalAvgScore').textContent = avg !== null ? `★ ${avg.toFixed(1)} / 10` : '– / 10';
    document.getElementById('modalReviewCount').textContent =
        monster.ratings.length > 0
            ? `${monster.ratings.length} Kollegen-Bewertung${monster.ratings.length === 1 ? '' : 'en'}`
            : 'Noch keine Bewertungen – sei der Erste!';

    // Kollegen-Bewertungen rendern
    const reviewsList = document.getElementById('modalReviewsList');
    reviewsList.innerHTML = '';

    if (monster.ratings.length === 0) {
        reviewsList.innerHTML = `<p class="small-text">Für diese Sorte gibt es noch keine Bewertungen.</p>`;
    } else {
        monster.ratings.slice().reverse().forEach(r => {
            const item = document.createElement('div');
            item.className = 'review-item';
            item.innerHTML = `
                <div class="review-item-header">
                    <span class="reviewer-name">👤 ${escapeHtml(r.user || 'Kollege')}</span>
                    <span class="review-score-badge">★ ${Number(r.score)} / 10</span>
                </div>
                ${r.comment ? `<p class="review-comment">${escapeHtml(r.comment)}</p>` : '<p class="small-text"><em>Kein Kommentar hinterlassen</em></p>'}
                ${r.date ? `<div class="review-meta">Bewertet am ${escapeHtml(r.date)}</div>` : ''}
            `;
            reviewsList.appendChild(item);
        });
    }

    // Gespeicherten Kollegen-Namen vorausfüllen, Punkte & Kommentar zurücksetzen
    // (bzw. mit der eigenen bisherigen Bewertung dieses Monsters füllen)
    const savedName = localStorage.getItem(STORAGE_KEYS.REVIEWER_NAME) || '';
    const nameInput = document.getElementById('reviewerNameInput');
    if (!nameInput.value && savedName) {
        nameInput.value = savedName;
    }
    const currentName = nameInput.value.trim().toLowerCase();
    const ownRating = currentName
        ? monster.ratings.find(r => (r.user || '').trim().toLowerCase() === currentName)
        : null;
    document.getElementById('reviewCommentInput').value = ownRating ? (ownRating.comment || '') : '';
    setScoreButtons(ownRating ? ownRating.score : null);

    document.getElementById('monsterModal').classList.remove('hidden');
}

function setScoreButtons(score) {
    appState.selectedScore = score === null || score === undefined ? null : Number(score);
    document.querySelectorAll('#scoreSelector .score-btn').forEach(btn => {
        btn.classList.toggle('active', Number(btn.dataset.score) === appState.selectedScore);
    });
}

// Bewertung aus dem Formular auslesen & validieren
function readRatingFormPayload() {
    const monsterId = appState.activeMonsterId;
    const user = document.getElementById('reviewerNameInput').value.trim();
    const comment = document.getElementById('reviewCommentInput').value.trim();
    const score = appState.selectedScore;

    if (!monsterId || !user) {
        showToast('Bitte gib deinen Namen ein!');
        return null;
    }
    if (!score) {
        showToast('Bitte wähle eine Punktzahl (1–10)!');
        return null;
    }

    localStorage.setItem(STORAGE_KEYS.REVIEWER_NAME, user);

    return {
        monsterId: Number(monsterId),
        user,
        score: Number(score),
        comment,
        date: new Date().toISOString().slice(0, 10)
    };
}

// Bewertung speichern (in Cloudflare D1 oder lokal als Fallback)
async function saveRating(rating) {
    const apiUrl = getD1ApiUrl();

    if (apiUrl) {
        try {
            const res = await fetch(`${apiUrl}/api/ratings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rating)
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                throw new Error(data.error || `HTTP ${res.status}`);
            }
            document.getElementById('reviewCommentInput').value = '';
            await syncFromCloudflareD1();
            refreshUI();
            showToast(`✅ Bewertung (${rating.score}/10) von ${rating.user} live in D1 gespeichert!`);
            return;
        } catch (err) {
            showToast(`D1-Speicherfehler (${err.message}) – speichere lokal.`);
        }
    }

    const localRatingsMap = getLocalJson(STORAGE_KEYS.LOCAL_RATINGS, {});
    if (!localRatingsMap[rating.monsterId]) {
        localRatingsMap[rating.monsterId] = [];
    }

    const existingIdx = localRatingsMap[rating.monsterId].findIndex(
        r => (r.user || '').toLowerCase() === rating.user.toLowerCase()
    );
    if (existingIdx >= 0) {
        localRatingsMap[rating.monsterId][existingIdx] = rating;
    } else {
        localRatingsMap[rating.monsterId].push(rating);
    }

    setLocalJson(STORAGE_KEYS.LOCAL_RATINGS, localRatingsMap);

    const localStatusMap = getLocalJson(STORAGE_KEYS.LOCAL_STATUS, {});
    localStatusMap[rating.monsterId] = 'tested';
    setLocalJson(STORAGE_KEYS.LOCAL_STATUS, localStatusMap);

    document.getElementById('reviewCommentInput').value = '';
    refreshUI();
    showToast(`Bewertung (${rating.score}/10) lokal gespeichert!`);
}

// Komplettes aktualisiertes JSON für data/monsters.json erzeugen
function buildExportableJsonString() {
    const merged = getMergedMonsters().map(m => ({
        id: m.id,
        name: m.name,
        category: m.category,
        status: m.status,
        image: m.image,
        caffeine: Number(m.caffeine),
        sugar: Number(m.sugar),
        taste: m.taste,
        ratings: m.ratings.map(r => ({
            user: r.user,
            score: Number(r.score),
            comment: r.comment || '',
            date: r.date || new Date().toISOString().slice(0, 10)
        }))
    }));

    const exportData = {
        meta: {
            ...appState.meta,
            apiUrl: getD1ApiUrl(),
            updatedAt: new Date().toISOString().slice(0, 10)
        },
        monsters: merged
    };

    return JSON.stringify(exportData, null, 2);
}

function updateJsonExportPreview() {
    const preview = document.getElementById('jsonExportPreview');
    if (preview) {
        preview.value = buildExportableJsonString();
    }
}

function showToast(message) {
    const toast = document.getElementById('toastNotification');
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toast.classList.add('hidden'), 3400);
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Event-Listener initialisieren
function bindEvents() {
    // Tabs wechseln
    document.querySelectorAll('.main-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.main-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const view = btn.dataset.view;
            const catalogView = document.getElementById('catalogView');
            const rankingView = document.getElementById('rankingView');

            if (view === 'ranking') {
                catalogView.classList.remove('active');
                rankingView.classList.add('active');
            } else {
                appState.currentView = view;
                rankingView.classList.remove('active');
                catalogView.classList.add('active');
            }
            refreshUI();
        });
    });

    // Suche & Filter
    ['searchInput', 'categoryFilter', 'sugarFilter', 'sortSelect', 'reviewerFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', refreshUI);
            el.addEventListener('change', refreshUI);
        }
    });

    // Punkte-Buttons (1-10)
    document.querySelectorAll('#scoreSelector .score-btn').forEach(btn => {
        btn.addEventListener('click', () => setScoreButtons(btn.dataset.score));
    });

    // Bewertung speichern (D1 oder lokal)
    document.getElementById('ratingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const rating = readRatingFormPayload();
        if (!rating) return;
        await saveRating(rating);
    });

    // Status eines Monsters ändern (Getestet <-> Demnächst)
    document.getElementById('saveStatusChangeBtn').addEventListener('click', async () => {
        if (!appState.activeMonsterId) return;
        const newStatus = document.getElementById('modalStatusSelect').value;
        const apiUrl = getD1ApiUrl();

        if (apiUrl) {
            try {
                const res = await fetch(`${apiUrl}/api/monsters/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ monsterId: appState.activeMonsterId, status: newStatus })
                });
                const data = await res.json();
                if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
                await syncFromCloudflareD1();
                refreshUI();
                showToast('✅ Status in Cloudflare D1 aktualisiert!');
                return;
            } catch (err) {
                showToast(`D1-Fehler (${err.message}) – speichere Status lokal.`);
            }
        }

        const localStatusMap = getLocalJson(STORAGE_KEYS.LOCAL_STATUS, {});
        localStatusMap[appState.activeMonsterId] = newStatus;
        setLocalJson(STORAGE_KEYS.LOCAL_STATUS, localStatusMap);
        refreshUI();
        showToast('Status lokal aktualisiert!');
    });

    // Neues Monster hinzufügen (D1 oder lokal)
    document.getElementById('addMonsterForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const monster = createMonsterFromForm();
        if (!monster) return;

        const apiUrl = getD1ApiUrl();
        if (apiUrl) {
            try {
                const res = await fetch(`${apiUrl}/api/monsters`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(monster)
                });
                const data = await res.json();
                if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);

                document.getElementById('addMonsterForm').reset();
                document.getElementById('addMonsterModal').classList.add('hidden');
                await syncFromCloudflareD1();
                refreshUI();
                showToast(`✅ "${monster.name}" live in D1 hinzugefügt!`);
                return;
            } catch (err) {
                showToast(`D1-Fehler (${err.message}) – speichere Monster lokal.`);
            }
        }

        const localMonsters = getLocalJson(STORAGE_KEYS.LOCAL_MONSTERS, []);
        localMonsters.push(monster);
        setLocalJson(STORAGE_KEYS.LOCAL_MONSTERS, localMonsters);

        document.getElementById('addMonsterForm').reset();
        document.getElementById('addMonsterModal').classList.add('hidden');
        refreshUI();
        showToast(`"${monster.name}" wurde lokal hinzugefügt!`);
    });

    // Modals öffnen & schließen
    document.getElementById('closeMonsterModalBtn').addEventListener('click', () => {
        appState.activeMonsterId = null;
        document.getElementById('monsterModal').classList.add('hidden');
    });

    document.getElementById('openAddMonsterBtn').addEventListener('click', () => {
        document.getElementById('addMonsterModal').classList.remove('hidden');
    });
    document.getElementById('closeAddMonsterModalBtn').addEventListener('click', () => {
        document.getElementById('addMonsterModal').classList.add('hidden');
    });

    document.getElementById('openSyncModalBtn').addEventListener('click', () => {
        updateJsonExportPreview();
        document.getElementById('syncModal').classList.remove('hidden');
    });
    document.getElementById('closeSyncModalBtn').addEventListener('click', () => {
        document.getElementById('syncModal').classList.add('hidden');
    });

    // Klick auf abgedunkelten Hintergrund schließt Modals
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                backdrop.classList.add('hidden');
                if (backdrop.id === 'monsterModal') appState.activeMonsterId = null;
            }
        });
    });

    // Verbindung zu Cloudflare D1 erneut prüfen
    document.getElementById('saveApiUrlBtn').addEventListener('click', async () => {
        await syncFromCloudflareD1();
        refreshUI();
        showToast(appState.d1Connected ? '✅ Mit Cloudflare D1 verbunden!' : '❌ Keine Verbindung zu Cloudflare D1.');
    });

    // JSON herunterladen
    document.getElementById('downloadJsonBtn').addEventListener('click', () => {
        const jsonStr = buildExportableJsonString();
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'monsters.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('monsters.json heruntergeladen!');
    });

    // JSON kopieren
    document.getElementById('copyJsonBtn').addEventListener('click', async () => {
        await navigator.clipboard.writeText(buildExportableJsonString());
        showToast('JSON in die Zwischenablage kopiert!');
    });

    // Lokale Entwürfe zurücksetzen
    document.getElementById('resetLocalChangesBtn').addEventListener('click', () => {
        localStorage.removeItem(STORAGE_KEYS.LOCAL_RATINGS);
        localStorage.removeItem(STORAGE_KEYS.LOCAL_MONSTERS);
        localStorage.removeItem(STORAGE_KEYS.LOCAL_STATUS);
        refreshUI();
        showToast('Lokale Zwischenspeicher zurückgesetzt.');
    });
}

function createMonsterFromForm() {
    const name = document.getElementById('newMonsterName').value.trim();
    if (!name) return null;

    const monsters = getMergedMonsters();
    const maxId = monsters.reduce((max, m) => Math.max(max, Number(m.id) || 0), 0);

    return {
        id: maxId + 1,
        name,
        status: document.getElementById('newMonsterStatus').value,
        category: document.getElementById('newMonsterCategory').value,
        image: document.getElementById('newMonsterImage').value.trim() || 'res/OriginalGreenMonsterEnergy.webp',
        sugar: parseFloat(document.getElementById('newMonsterSugar').value) || 0,
        caffeine: parseInt(document.getElementById('newMonsterCaffeine').value, 10) || 160,
        taste: document.getElementById('newMonsterTaste').value.trim() || 'Noch keine Beschreibung',
        ratings: []
    };
}

// App starten
(async function initApp() {
    bindEvents();
    await loadBaseJson();
    await syncFromCloudflareD1();
    refreshUI();
})();
