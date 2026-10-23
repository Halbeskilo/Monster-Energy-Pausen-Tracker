-- Cloudflare D1 Schema für den Monster Energy Pausen-Tracker

CREATE TABLE IF NOT EXISTS monsters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Monster',
    status TEXT NOT NULL DEFAULT 'upcoming', -- 'tested' oder 'upcoming'
    image TEXT NOT NULL DEFAULT 'res/OriginalGreenMonsterEnergy.webp',
    caffeine INTEGER NOT NULL DEFAULT 160,
    sugar REAL NOT NULL DEFAULT 0,
    taste TEXT NOT NULL DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    monster_id INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),
    comment TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (monster_id) REFERENCES monsters(id) ON DELETE CASCADE,
    UNIQUE(monster_id, user_name COLLATE NOCASE)
);

-- Basis-Monster (alle 31 Sorten)
INSERT OR IGNORE INTO monsters (id, name, category, status, image, caffeine, sugar, taste) VALUES
(1, 'Original Green Monster Energy', 'Original', 'tested', 'res/OriginalGreenMonsterEnergy.webp', 160, 55, 'Original, klassisch, süß'),
(2, 'Ultra White (Das Weiße Monster)', 'Ultra (Zero Sugar)', 'tested', 'res/UltraA.K.A.DasWisseMonster.webp', 150, 0, 'Leicht, zitronig, erfrischend, zuckerfrei'),
(3, 'Mango Loco (Juiced)', 'Juiced', 'tested', 'res/MangoLoco.webp', 160, 55, 'Mango, süß, exotisch, fruchtig'),
(4, 'Punch Monster Pipeline Punch', 'Punch', 'tested', 'res/PunchMonsterPipelinePunch.webp', 160, 46, 'Passionsfrucht, Orange, Guave, süß'),
(5, 'Juiced Monster Aussie Lemonade', 'Juiced', 'tested', 'res/JuicedMonsterAussieLemonade.webp', 160, 53, 'Herbe Zitronenlimonade, spritzig'),
(6, 'Juiced Monster Bad Apple', 'Juiced', 'tested', 'res/JuicedMonsterbadApple.webp', 160, 41, 'Knackiger Apfel, Cidre-Note, fruchtig'),
(7, 'Zero Zucker Ultra Peachy Keen', 'Ultra (Zero Sugar)', 'tested', 'res/ZeroZuckerUltraPeachyKeen.webp', 150, 0, 'Süßer Pfirsich, zuckerfrei'),
(8, 'Zero Zucker Ultra Strawberry Dreams', 'Ultra (Zero Sugar)', 'tested', 'res/ZeroZuckerUltraStrawberryDreams.webp', 150, 0, 'Erdbeere, leicht cremig, zuckerfrei'),
(9, 'Lando Norris Zero Sugar', 'Special Edition', 'upcoming', 'res/andoNorrisZeroSugar.webp', 160, 0, 'Erfrischend, leicht, zuckerfrei'),
(10, 'Juiced Monster Viking Berry', 'Juiced', 'upcoming', 'res/JuicedMonsterVikingBerry.webp', 160, 42, 'Nordische Beeren, Waldbeere, fruchtig'),
(11, 'Punch Monster Rio Punch', 'Punch', 'upcoming', 'res/PunchMonsterRioPunch.webp', 160, 50, 'Papaya, Vanille-Eis-Note, Schwarze Johannisbeere'),
(12, 'Zero Zucker Fantasy Ruby Red', 'Ultra (Zero Sugar)', 'upcoming', 'res/ZeroZuckerFantasyRubyRed.webp', 150, 0, 'Pink Grapefruit, Zitrus, zuckerfrei'),
(13, 'Monster Energy Nitro Cosmic Peach', 'Nitro', 'upcoming', 'res/MonsterEnergyNitroCosmicPeach.webp', 160, 53, 'Pfirsich, feinperlig cremig (Nitro)'),
(14, 'Monster Energy Nitro Super Dry', 'Nitro', 'tested', 'res/MonsterEnergyNitroSuperDry.webp', 160, 53, 'Spritzige Limette/Zitrus, trockenes Finish'),
(15, 'Juiced Monster Monarch', 'Juiced', 'tested', 'res/JuicedMonsterMonarch.webp', 160, 44, 'Pfirsich & Nektarine, weich und fruchtig'),
(16, 'Juiced Monster Khaotic', 'Juiced', 'upcoming', 'res/JuicedMonsterKhaotic.webp', 160, 37, 'Tropische Orange, fruchtig-süß'),
(17, 'Punch Monster Pacific Punch', 'Punch', 'tested', 'res/PunchMonsterPacificPunch.webp', 160, 55, 'Klassischer Fruchtpunsch, Kirsche & Ananas'),
(18, 'Punch Monster Mixxd Punch', 'Punch', 'upcoming', 'res/PunchMonsterMixxdPunch.webp', 160, 38, 'Beeren-Kirsch-Punsch, tropisch'),
(19, 'Monster Rehab Peach Iced Tea', 'Rehab (Ohne Kohlensäure)', 'tested', 'res/MonsterRehabPeachIcedTea.webp', 160, 11, 'Pfirsich-Eistee ohne Kohlensäure, sehr süffig'),
(20, 'Monster Rehab Iced Tea Lemonade', 'Rehab (Ohne Kohlensäure)', 'upcoming', 'res/MonsterRehabIcedTeaLemonade.webp', 160, 10, 'Zitronen-Eistee ohne Kohlensäure, erfrischend'),
(21, 'Zero Zucker Ultra Paradise', 'Ultra (Zero Sugar)', 'tested', 'res/ZeroZuckerUltraParadise.webp', 150, 0, 'Kiwi, Limette & ein Hauch Gurke, zuckerfrei'),
(22, 'Zero Zucker Ultra Fiesta Mango', 'Ultra (Zero Sugar)', 'tested', 'res/ZeroZuckerUltraFiesta.webp', 150, 0, 'Saftige Mango ohne Zucker'),
(23, 'Zero Zucker Ultra Gold', 'Ultra (Zero Sugar)', 'upcoming', 'res/ZeroZuckerUltraGold.webp', 150, 0, 'Goldene Ananas, erfrischend, zuckerfrei'),
(24, 'Zero Zucker Ultra Rosa', 'Ultra (Zero Sugar)', 'tested', 'res/ZeroZuckerUltraRosa.webp', 150, 0, 'Pinke Limonade, Beeren & florale Note'),
(25, 'Zero Zucker Ultra Watermelon', 'Ultra (Zero Sugar)', 'upcoming', 'res/ZeroZuckerUltraWatermelon.webp', 150, 0, 'Kräftige Wassermelone, süß-säuerlich'),
(26, 'Original Zero Zucker (Grün/Blau)', 'Original', 'tested', 'res/OriginalZeroZuckerMonsterEnergy.webp', 160, 0, 'Wie das Original Green, aber ohne Zucker'),
(27, 'Zero Sugar Monster Energy', 'Original', 'upcoming', 'res/ZeroSuggarMonsterEnergy.webp', 160, 0, 'Klassisches Monster-Profil, zuckerfrei'),
(28, 'Top Speed Zero Sugar (Lewis Hamilton)', 'Special Edition', 'tested', 'res/TopSpeedZeroSugar.webp', 160, 0, 'Steinobst, Pfirsich-Nektarine, zuckerfrei'),
(29, 'VR46 The Doctor', 'Special Edition', 'tested', 'res/VR46AlaisDerDoctorMonsterEnergy.webp', 160, 55, 'Spritzige Orange & Zitrone (wie Fanta mit Kick)'),
(30, 'VR46 Zero Sugar', 'Special Edition', 'upcoming', 'res/VR46ZeroSugar.webp', 160, 0, 'Sonnige Zitrus-Orange ohne Zucker'),
(31, 'Monster Energy Assault', 'Special Edition', 'upcoming', 'res/MonsterEnergyAssault.webp', 160, 55, 'Cola-Kirsch-Note, kräftig süß');
