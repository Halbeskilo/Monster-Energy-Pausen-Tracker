// Monster Energy Pausen-Tracker (Statisches JSON + GitHub Issues API + LocalStorage)

const STORAGE_KEYS = {
    LOCAL_RATINGS: 'monsterList_localRatings_v1',
    LOCAL_MONSTERS: 'monsterList_localMonsters_v1',
    LOCAL_STATUS: 'monsterList_localStatus_v1',
    REVIEWER_NAME: 'monsterList_reviewerName_v1',
    GITHUB_REPO: 'monsterList_githubRepo_v1'
};

let appState = {
    meta: { title: 'Monster Energy Pausen-Tracker', githubRepo: '' },
    baseMonsters: [],
    issueRatings: [],
    issueMonsters: [],
    currentView: 'tested',
    activeMonsterId: null,
    selectedScore: 8
};

// Fallback-Daten, falls jemand index.html direkt per Doppelklick (file://) ohne lokalen Server öffnet
const FALLBACK_MONSTERS = [
    { id: 1, name: "Original Green Monster Energy", category: "Original", status: "tested", image: "res/OriginalGreenMonsterEnergy.webp", caffeine: 160, sugar: 55, taste: "Original, klassisch, süß", ratings: [] },
    { id: 2, name: "Ultra White (Das Weiße Monster)", category: "Ultra (Zero Sugar)", status: "tested", image: "res/UltraA.K.A.DasWisseMonster.webp", caffeine: 150, sugar: 0, taste: "Leicht, zitronig, erfrischend, zuckerfrei", ratings: [] },
    { id: 3, name: "Mango Loco (Juiced)", category: "Juiced", status: "tested", image: "res/MangoLoco.webp", caffeine: 160, sugar: 55, taste: "Mango, süß, exotisch, fruchtig", ratings: [] },
    { id: 4, name: "Punch Monster Pipeline Punch", category: "Punch", status: "tested", image: "res/PunchMonsterPipelinePunch.webp", caffeine: 160, sugar: 46, taste: "Passionsfrucht, Orange, Guave, süß", ratings: [] },
    { id: 5, name: "Juiced Monster Aussie Lemonade", category: "Juiced", status: "tested", image: "res/JuicedMonsterAussieLemonade.webp", caffeine: 160, sugar: 53, taste: "Herbe Zitronenlimonade, spritzig", ratings: [] },
    { id: 6, name: "Juiced Monster Bad Apple", category: "Juiced", status: "tested", image: "res/JuicedMonsterbadApple.webp", caffeine: 160, sugar: 41, taste: "Knackiger Apfel, Cidre-Note, fruchtig", ratings: [] },
    { id: 7, name: "Zero Zucker Ultra Peachy Keen", category: "Ultra (Zero Sugar)", status: "tested", image: "res/ZeroZuckerUltraPeachyKeen.webp", caffeine: 150, sugar: 0, taste: "Süßer Pfirsich, zuckerfrei", ratings: [] },
    { id: 8, name: "Zero Zucker Ultra Strawberry Dreams", category: "Ultra (Zero Sugar)", status: "tested", image: "res/ZeroZuckerUltraStrawberryDreams.webp", caffeine: 150, sugar: 0, taste: "Erdbeere, leicht cremig, zuckerfrei", ratings: [] },
    { id: 9, name: "Lando Norris Zero Sugar", category: "Special Edition", status: "upcoming", image: "res/andoNorrisZeroSugar.webp", caffeine: 160, sugar: 0, taste: "Erfrischend, leicht, zuckerfrei", ratings: [] },
    { id: 10, name: "Juiced Monster Viking Berry", category: "Juiced", status: "upcoming", image: "res/JuicedMonsterVikingBerry.webp", caffeine: 160, sugar: 42, taste: "Nordische Beeren, Waldbeere, fruchtig", ratings: [] },
    { id: 11, name: "Punch Monster Rio Punch", category: "Punch", status: "upcoming", image: "res/PunchMonsterRioPunch.webp", caffeine: 160, sugar: 50, taste: "Papaya, Vanille-Eis-Note, Schwarze Johannisbeere", ratings: [] },
    { id: 12, name: "Zero Zucker Fantasy Ruby Red", category: "Ultra (Zero Sugar)", status: "upcoming", image: "res/ZeroZuckerFantasyRubyRed.webp", caffeine: 150, sugar: 0, taste: "Pink Grapefruit, Zitrus, zuckerfrei", ratings: [] },
    { id: 13, name: "Monster Energy Nitro Cosmic Peach", category: "Nitro", status: "upcoming", image: "res/MonsterEnergyNitroCosmicPeach.webp", caffeine: 160, sugar: 53, taste: "Pfirsich, feinperlig cremig (Nitro)", ratings: [] },
    { id: 14, name: "Monster Energy Nitro Super Dry", category: "Nitro", status: "tested", image: "res/MonsterEnergyNitroSuperDry.webp", caffeine: 160, sugar: 53, taste: "Spritzige Limette/Zitrus, trockenes Finish", ratings: [] },
    { id: 15, name: "Juiced Monster Monarch", category: "Juiced", status: "tested", image: "res/JuicedMonsterMonarch.webp", caffeine: 160, sugar: 44, taste: "Pfirsich & Nektarine, weich und fruchtig", ratings: [] },
    { id: 16, name: "Juiced Monster Khaotic", category: "Juiced", status: "upcoming", image: "res/JuicedMonsterKhaotic.webp", caffeine: 160, sugar: 37, taste: "Tropische Orange, fruchtig-süß", ratings: [] },
    { id: 17, name: "Punch Monster Pacific Punch", category: "Punch", status: "tested", image: "res/PunchMonsterPacificPunch.webp", caffeine: 160, sugar: 55, taste: "Klassischer Fruchtpunsch, Kirsche & Ananas", ratings: [] },
    { id: 18, name: "Punch Monster Mixxd Punch", category: "Punch", status: "upcoming", image: "res/PunchMonsterMixxdPunch.webp", caffeine: 160, sugar: 38, taste: "Beeren-Kirsch-Punsch, tropisch", ratings: [] },
    { id: 19, name: "Monster Rehab Peach Iced Tea", category: "Rehab (Ohne Kohlensäure)", status: "tested", image: "res/MonsterRehabPeachIcedTea.webp", caffeine: 160, sugar: 11, taste: "Pfirsich-Eistee ohne Kohlensäure, sehr süffig", ratings: [] },
    { id: 20, name: "Monster Rehab Iced Tea Lemonade", category: "Rehab (Ohne Kohlensäure)", status: "upcoming", image: "res/MonsterRehabIcedTeaLemonade.webp", caffeine: 160, sugar: 10, taste: "Zitronen-Eistee ohne Kohlensäure, erfrischend", ratings: [] },
    { id: 21, name: "Zero Zucker Ultra Paradise", category: "Ultra (Zero Sugar)", status: "tested", image: "res/ZeroZuckerUltraParadise.webp", caffeine: 150, sugar: 0, taste: "Kiwi, Limette & ein Hauch Gurke, zuckerfrei", ratings: [] },
    { id: 22, name: "Zero Zucker Ultra Fiesta Mango", category: "Ultra (Zero Sugar)", status: "tested", image: "res/ZeroZuckerUltraFiesta.webp", caffeine: 150, sugar: 0, taste: "Saftige Mango ohne Zucker", ratings: [] },
    { id: 23, name: "Zero Zucker Ultra Gold", category: "Ultra (Zero Sugar)", status: "upcoming", image: "res/ZeroZuckerUltraGold.webp", caffeine: 150, sugar: 0, taste: "Goldene Ananas, erfrischend, zuckerfrei", ratings: [] },
    { id: 24, name: "Zero Zucker Ultra Rosa", category: "Ultra (Zero Sugar)", status: "tested", image: "res/ZeroZuckerUltraRosa.webp", caffeine: 150, sugar: 0, taste: "Pinke Limonade, Beeren & florale Note", ratings: [] },
    { id: 25, name: "Zero Zucker Ultra Watermelon", category: "Ultra (Zero Sugar)", status: "upcoming", image: "res/ZeroZuckerUltraWatermelon.webp", caffeine: 150, sugar: 0, taste: "Kräftige Wassermelone, süß-säuerlich", ratings: [] },
    { id: 26, name: "Original Zero Zucker (Grün/Blau)", category: "Original", status: "tested", image: "res/OriginalZeroZuckerMonsterEnergy.webp", caffeine: 160, sugar: 0, taste: "Wie das Original Green, aber ohne Zucker", ratings: [] },
    { id: 27, name: "Zero Sugar Monster Energy", category: "Original", status: "upcoming", image: "res/ZeroSuggarMonsterEnergy.webp", caffeine: 160, sugar: 0, taste: "Klassisches Monster-Profil, zuckerfrei", ratings: [] },
    { id: 28, name: "Top Speed Zero Sugar (Lewis Hamilton)", category: "Special Edition", status: "tested", image: "res/TopSpeedZeroSugar.webp", caffeine: 160, sugar: 0, taste: "Steinobst, Pfirsich-Nektarine, zuckerfrei", ratings: [] },
    { id: 29, name: "VR46 The Doctor", category: "Special Edition", status: "tested", image: "res/VR46AlaisDerDoctorMonsterEnergy.webp", caffeine: 160, sugar: 55, taste: "Spritzige Orange & Zitrone (wie Fanta mit Kick)", ratings: [] },
    { id: 30, name: "VR46 Zero Sugar", category: "Special Edition", status: "upcoming", image: "res/VR46ZeroSugar.webp", caffeine: 160, sugar: 0, taste: "Sonnige Zitrus-Orange ohne Zucker", ratings: [] },
    { id: 31, name: "Monster Energy Assault", category: "Special Edition", status: "upcoming", image: "res/MonsterEnergyAssault.webp", caffeine: 160, sugar: 55, taste: "Cola-Kirsch-Note, kräftig süß", ratings: [] }
];

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

// Automatische Erkennung des GitHub Repositories auf GitHub Pages (<owner>.github.io/<repo>/)
function detectGithubRepo() {
    const saved = localStorage.getItem(STORAGE_KEYS.GITHUB_REPO);
    if (saved) return saved.trim();

    if (appState.meta && appState.meta.githubRepo) {
        return appState.meta.githubRepo.trim();
    }

    const host = window.location.hostname;
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (host.endsWith('.github.io') && pathParts.length >= 1) {
        const owner = host.replace('.github.io', '');
        const repo = pathParts[0];
        return `${owner}/${repo}`;
    }
    return '';
}

// Alle Monster + Bewertungen (Basis-JSON + GitHub Issues + LocalStorage) zusammenführen
function getMergedMonsters() {
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

    // Monster aus GitHub Issues
    appState.issueMonsters.forEach(m => {
        if (!byId.has(Number(m.id))) {
            byId.set(Number(m.id), {
                ...m,
                id: Number(m.id),
                ratings: []
            });
        }
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

        const issueRatingsForMonster = appState.issueRatings.filter(r => Number(r.monsterId) === id);
        const localRatingsForMonster = localRatingsMap[id] || [];

        const combined = [...monster.ratings, ...issueRatingsForMonster, ...localRatingsForMonster];

        // Duplikate vermeiden (gleicher Name + Score + Kommentar)
        const seen = new Set();
        monster.ratings = combined.filter(r => {
            const key = `${(r.user || '').toLowerCase().trim()}|${r.score}|${(r.comment || '').trim()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // Wenn mindestens eine Bewertung vorliegt und Status nicht explizit geändert wurde, gilt es als getestet
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
        appState.baseMonsters = Array.isArray(json.monsters) ? json.monsters : FALLBACK_MONSTERS;
    } catch {
        appState.baseMonsters = FALLBACK_MONSTERS;
    }
}

// Live-Daten aus GitHub Issues API abrufen (ohne Token lesbar für Public Repos)
async function syncFromGithubIssues() {
    const repo = detectGithubRepo();
    const statusText = document.getElementById('syncStatusText');
    const feedback = document.getElementById('repoSyncFeedback');

    if (!repo) {
        statusText.textContent = 'Team-Sync (Lokal)';
        if (feedback) {
            feedback.textContent = 'Kein GitHub-Repository hinterlegt. Auf GitHub Pages wird es automatisch erkannt.';
        }
        return;
    }

    statusText.textContent = `Sync: ${repo}`;
    try {
        const url = `https://api.github.com/repos/${repo}/issues?state=open&per_page=100`;
        const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
        if (!res.ok) throw new Error(`GitHub API Status ${res.status}`);

        const issues = await res.json();
        const parsedRatings = [];
        const parsedMonsters = [];

        issues.forEach(issue => {
            if (!issue.body) return;
            const jsonMatch = issue.body.match(/```json\s*([\s\S]*?)```/);
            if (!jsonMatch) return;

            try {
                const payload = JSON.parse(jsonMatch[1].trim());
                if (payload.type === 'monster-rating' && payload.monsterId && payload.score) {
                    parsedRatings.push({
                        monsterId: Number(payload.monsterId),
                        user: payload.user || issue.user?.login || 'Kollege',
                        score: Number(payload.score),
                        comment: payload.comment || '',
                        date: (issue.created_at || '').slice(0, 10),
                        source: 'github-issue'
                    });
                } else if (payload.type === 'new-monster' && payload.monster && payload.monster.name) {
                    parsedMonsters.push(payload.monster);
                }
            } catch {
                // Ignoriere Issues ohne valides JSON
            }
        });

        appState.issueRatings = parsedRatings;
        appState.issueMonsters = parsedMonsters;

        if (feedback) {
            feedback.textContent = `Verbunden mit ${repo} (${parsedRatings.length} Live-Bewertungen aus offenen GitHub Issues geladen).`;
        }
    } catch (err) {
        if (feedback) {
            feedback.textContent = `Hinweis: GitHub API für "${repo}" noch nicht erreichbar (${err.message}).`;
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

    // Gespeicherten Kollegen-Namen vorausfüllen
    const savedName = localStorage.getItem(STORAGE_KEYS.REVIEWER_NAME) || '';
    const nameInput = document.getElementById('reviewerNameInput');
    if (!nameInput.value && savedName) {
        nameInput.value = savedName;
    }

    setScoreButtons(appState.selectedScore);
    document.getElementById('monsterModal').classList.remove('hidden');
}

function setScoreButtons(score) {
    appState.selectedScore = Number(score);
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

    localStorage.setItem(STORAGE_KEYS.REVIEWER_NAME, user);

    return {
        monsterId: Number(monsterId),
        user,
        score: Number(score),
        comment,
        date: new Date().toISOString().slice(0, 10)
    };
}

// Lokal speichern & Status auf 'tested' setzen
function saveRatingLocally(rating) {
    const localRatingsMap = getLocalJson(STORAGE_KEYS.LOCAL_RATINGS, {});
    if (!localRatingsMap[rating.monsterId]) {
        localRatingsMap[rating.monsterId] = [];
    }

    // Falls derselbe Kollege dieses Monster schon lokal bewertet hat, aktualisieren
    const existingIdx = localRatingsMap[rating.monsterId].findIndex(
        r => (r.user || '').toLowerCase() === rating.user.toLowerCase()
    );
    if (existingIdx >= 0) {
        localRatingsMap[rating.monsterId][existingIdx] = rating;
    } else {
        localRatingsMap[rating.monsterId].push(rating);
    }

    setLocalJson(STORAGE_KEYS.LOCAL_RATINGS, localRatingsMap);

    // Status automatisch auf 'tested' stellen
    const localStatusMap = getLocalJson(STORAGE_KEYS.LOCAL_STATUS, {});
    localStatusMap[rating.monsterId] = 'tested';
    setLocalJson(STORAGE_KEYS.LOCAL_STATUS, localStatusMap);

    document.getElementById('reviewCommentInput').value = '';
    refreshUI();
}

// GitHub Issue URL zum Teilen mit allen Kollegen öffnen
function openGithubIssueForRating(rating) {
    const repo = detectGithubRepo();
    const monsters = getMergedMonsters();
    const monster = monsters.find(m => m.id === rating.monsterId);
    const monsterName = monster ? monster.name : `Monster #${rating.monsterId}`;

    if (!repo) {
        showToast('Bitte trage zuerst unter "Team-Sync" euer GitHub-Repo (z.B. user/MonsterList) ein!');
        document.getElementById('syncModal').classList.remove('hidden');
        return;
    }

    const payload = {
        type: 'monster-rating',
        monsterId: rating.monsterId,
        monsterName,
        user: rating.user,
        score: rating.score,
        comment: rating.comment,
        date: rating.date
    };

    const title = `[Bewertung] ${monsterName} – ${rating.score}/10 von ${rating.user}`;
    const body = [
        `### Monster Energy Bewertung`,
        `- **Sorte:** ${monsterName} (ID: ${rating.monsterId})`,
        `- **Kollege:** ${rating.user}`,
        `- **Punkte:** ${rating.score} / 10`,
        `- **Kommentar:** ${rating.comment || '-'}`,
        ``,
        `<!-- Automatisch generierte Daten für GitHub Pages & GitHub Action -->`,
        '```json',
        JSON.stringify(payload, null, 2),
        '```'
    ].join('\n');

    const issueUrl = `https://github.com/${repo}/issues/new?labels=rating&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    window.open(issueUrl, '_blank', 'noopener');
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
            githubRepo: detectGithubRepo(),
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

    // Bewertung speichern (lokal)
    document.getElementById('ratingForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const rating = readRatingFormPayload();
        if (!rating) return;
        saveRatingLocally(rating);
        showToast(`Bewertung (${rating.score}/10) von ${rating.user} gespeichert!`);
    });

    // Bewertung zusätzlich auf GitHub teilen
    document.getElementById('submitRatingViaGithubBtn').addEventListener('click', () => {
        const rating = readRatingFormPayload();
        if (!rating) return;
        saveRatingLocally(rating);
        openGithubIssueForRating(rating);
    });

    // Status eines Monsters ändern (Getestet <-> Demnächst)
    document.getElementById('saveStatusChangeBtn').addEventListener('click', () => {
        if (!appState.activeMonsterId) return;
        const newStatus = document.getElementById('modalStatusSelect').value;
        const localStatusMap = getLocalJson(STORAGE_KEYS.LOCAL_STATUS, {});
        localStatusMap[appState.activeMonsterId] = newStatus;
        setLocalJson(STORAGE_KEYS.LOCAL_STATUS, localStatusMap);
        refreshUI();
        showToast('Status aktualisiert!');
    });

    // Neues Monster hinzufügen (lokal)
    document.getElementById('addMonsterForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const monster = createMonsterFromForm();
        if (!monster) return;

        const localMonsters = getLocalJson(STORAGE_KEYS.LOCAL_MONSTERS, []);
        localMonsters.push(monster);
        setLocalJson(STORAGE_KEYS.LOCAL_MONSTERS, localMonsters);

        document.getElementById('addMonsterForm').reset();
        document.getElementById('addMonsterModal').classList.add('hidden');
        refreshUI();
        showToast(`"${monster.name}" wurde hinzugefügt!`);
    });

    // Neues Monster per GitHub Issue einreichen
    document.getElementById('submitNewMonsterGithubBtn').addEventListener('click', () => {
        const monster = createMonsterFromForm();
        if (!monster) return;

        const localMonsters = getLocalJson(STORAGE_KEYS.LOCAL_MONSTERS, []);
        localMonsters.push(monster);
        setLocalJson(STORAGE_KEYS.LOCAL_MONSTERS, localMonsters);
        refreshUI();

        const repo = detectGithubRepo();
        if (!repo) {
            showToast('Monster lokal gespeichert! Für GitHub-Issues bitte unter "Team-Sync" das Repo angeben.');
            return;
        }

        const payload = { type: 'new-monster', monster };
        const title = `[Neues Monster] ${monster.name} (${monster.status === 'tested' ? 'Getestet' : 'Demnächst'})`;
        const body = [
            `### Neues Monster für die Liste`,
            `- **Name:** ${monster.name}`,
            `- **Status:** ${monster.status}`,
            `- **Kategorie:** ${monster.category}`,
            `- **Bild:** ${monster.image}`,
            '',
            '```json',
            JSON.stringify(payload, null, 2),
            '```'
        ].join('\n');

        const url = `https://github.com/${repo}/issues/new?labels=new-monster&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
        window.open(url, '_blank', 'noopener');
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
        document.getElementById('githubRepoInput').value = detectGithubRepo();
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

    // GitHub-Repo speichern & neu synchronisieren
    document.getElementById('saveRepoConfigBtn').addEventListener('click', async () => {
        const val = document.getElementById('githubRepoInput').value.trim();
        localStorage.setItem(STORAGE_KEYS.GITHUB_REPO, val);
        await syncFromGithubIssues();
        refreshUI();
        showToast('GitHub-Sync aktualisiert!');
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
    await syncFromGithubIssues();
    refreshUI();
})();
