/**
 * Cloudflare Worker + D1 API für den Monster Energy Pausen-Tracker
 *
 * WICHTIG im Cloudflare Dashboard:
 * Unter "Workers & Pages" -> Dein Worker -> "Settings" -> "Bindings"
 * eine D1-Datenbank-Verknüpfung (Binding) mit dem Variablennamen: DB  anlegen!
 */

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8'
};

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        if (!env.DB) {
            return jsonResponse({
                error: 'D1 Binding "DB" fehlt! Bitte im Cloudflare Worker unter Settings -> Bindings -> D1 Database Binding mit dem Namen "DB" verbinden.'
            }, 500);
        }

        const url = new URL(request.url);
        const path = url.pathname.replace(/\/+$/, '') || '/';

        try {
            // 1. GET /api/data -> Alle Monster + alle Kollegen-Bewertungen laden
            if (request.method === 'GET' && (path === '/api/data' || path === '')) {
                const monstersRes = await env.DB.prepare(
                    'SELECT id, name, category, status, image, caffeine, sugar, taste FROM monsters ORDER BY id ASC'
                ).all();

                const ratingsRes = await env.DB.prepare(
                    'SELECT id, monster_id, user_name, score, comment, date FROM ratings ORDER BY id ASC'
                ).all();

                const ratingsByMonster = new Map();
                for (const r of ratingsRes.results || []) {
                    if (!ratingsByMonster.has(r.monster_id)) {
                        ratingsByMonster.set(r.monster_id, []);
                    }
                    ratingsByMonster.get(r.monster_id).push({
                        id: r.id,
                        monsterId: r.monster_id,
                        user: r.user_name,
                        score: Number(r.score),
                        comment: r.comment || '',
                        date: r.date
                    });
                }

                const monsters = (monstersRes.results || []).map(m => ({
                    ...m,
                    id: Number(m.id),
                    caffeine: Number(m.caffeine),
                    sugar: Number(m.sugar),
                    ratings: ratingsByMonster.get(m.id) || []
                }));

                return jsonResponse({ ok: true, monsters });
            }

            // 2. POST /api/ratings -> Bewertung abgeben oder aktualisieren
            if (request.method === 'POST' && path === '/api/ratings') {
                const body = await request.json();
                const monsterId = Number(body.monsterId);
                const user = String(body.user || '').trim();
                const score = Number(body.score);
                const comment = String(body.comment || '').trim();
                const date = String(body.date || new Date().toISOString().slice(0, 10));

                if (!monsterId || !user || !(score >= 1 && score <= 10)) {
                    return jsonResponse({ error: 'Ungültige Bewertungsdaten (monsterId, user, score 1-10 erforderlich).' }, 400);
                }

                await env.DB.prepare(`
                    INSERT INTO ratings (monster_id, user_name, score, comment, date)
                    VALUES (?1, ?2, ?3, ?4, ?5)
                    ON CONFLICT(monster_id, user_name) DO UPDATE SET
                        score = excluded.score,
                        comment = excluded.comment,
                        date = excluded.date
                `).bind(monsterId, user, score, comment, date).run();

                // Sobald ein Monster bewertet wurde, Status in D1 automatisch auf 'tested' setzen
                await env.DB.prepare(`UPDATE monsters SET status = 'tested' WHERE id = ?1`).bind(monsterId).run();

                return jsonResponse({ ok: true });
            }

            // 3. POST /api/monsters -> Neues Monster in D1 anlegen
            if (request.method === 'POST' && path === '/api/monsters') {
                const body = await request.json();
                const name = String(body.name || '').trim();
                const category = String(body.category || 'Special Edition').trim();
                const status = body.status === 'tested' ? 'tested' : 'upcoming';
                const image = String(body.image || 'res/OriginalGreenMonsterEnergy.webp').trim();
                const caffeine = Number(body.caffeine) || 160;
                const sugar = Number(body.sugar) || 0;
                const taste = String(body.taste || '').trim();

                if (!name) {
                    return jsonResponse({ error: 'Name des Monsters fehlt.' }, 400);
                }

                const result = await env.DB.prepare(`
                    INSERT INTO monsters (name, category, status, image, caffeine, sugar, taste)
                    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                `).bind(name, category, status, image, caffeine, sugar, taste).run();

                return jsonResponse({ ok: true, id: result.meta?.last_row_id });
            }

            // 4. PATCH /api/monsters/status -> Status ('tested' / 'upcoming') ändern
            if (request.method === 'PATCH' && path === '/api/monsters/status') {
                const body = await request.json();
                const monsterId = Number(body.monsterId);
                const status = body.status === 'tested' ? 'tested' : 'upcoming';

                if (!monsterId) {
                    return jsonResponse({ error: 'monsterId fehlt.' }, 400);
                }

                await env.DB.prepare(`UPDATE monsters SET status = ?1 WHERE id = ?2`).bind(status, monsterId).run();
                return jsonResponse({ ok: true });
            }

            return jsonResponse({ error: 'Endpunkt nicht gefunden.' }, 404);
        } catch (err) {
            return jsonResponse({ error: err.message || 'Serverfehler in Cloudflare Worker' }, 500);
        }
    }
};
