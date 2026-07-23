CREATE TABLE kunden (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    firmenname TEXT NOT NULL,
    branche TEXT CHECK (branche IN ('friseur','physio','werkstatt','coach','kanzlei','sonstige')) DEFAULT 'sonstige',
    email TEXT, telefon TEXT, kalender_url TEXT, system_prompt TEXT,
    preis_paket TEXT CHECK (preis_paket IN ('basic','standard','enterprise')) DEFAULT 'basic',
    status TEXT CHECK (status IN ('aktiv','inaktiv','setup')) DEFAULT 'setup',
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dienstleistungen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kunde_id UUID REFERENCES kunden(id) ON DELETE CASCADE,
    name TEXT NOT NULL, dauer_minuten INTEGER NOT NULL, preis_eur_cents INTEGER NOT NULL,
    kategorie TEXT, aktiv BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE oeffnungszeiten (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kunde_id UUID REFERENCES kunden(id) ON DELETE CASCADE,
    wochentag INTEGER CHECK (wochentag BETWEEN 0 AND 6),
    oeffnet TIME NOT NULL, schliesst TIME NOT NULL, UNIQUE(kunde_id, wochentag)
);

CREATE TABLE gespraeche (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kunde_id UUID REFERENCES kunden(id) ON DELETE CASCADE,
    anrufer_nummer TEXT, anrufer_name TEXT, anliegen TEXT,
    sentiment_verfassung TEXT, sentiment_score FLOAT CHECK (sentiment_score BETWEEN 0 AND 1),
    dringlichkeit INTEGER CHECK (dringlichkeit BETWEEN 0 AND 10), escalation BOOLEAN DEFAULT FALSE,
    ergebnis TEXT, dauer_sekunden INTEGER, timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_nachrichten (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kunde_id UUID REFERENCES kunden(id) ON DELETE CASCADE,
    gespraech_id UUID REFERENCES gespraeche(id) ON DELETE SET NULL,
    rolle TEXT CHECK (rolle IN ('user','assistant','system')), content TEXT NOT NULL,
    extraktion JSONB, sentiment JSONB, timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE zahlungen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kunde_id UUID REFERENCES kunden(id) ON DELETE CASCADE, invoice_id TEXT UNIQUE NOT NULL,
    betrag_eur_cents INTEGER NOT NULL, crypto_asset TEXT NOT NULL, crypto_amount NUMERIC(18,8),
    wallet_adresse TEXT NOT NULL, tx_hash TEXT,
    status TEXT CHECK (status IN ('pending','confirming','paid','expired')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(), paid_at TIMESTAMPTZ
);

CREATE INDEX idx_kunden_user ON kunden(user_id);
CREATE INDEX idx_dienstleistungen_kunde ON dienstleistungen(kunde_id);
CREATE INDEX idx_gespraeche_kunde ON gespraeche(kunde_id);
CREATE INDEX idx_gespraeche_timestamp ON gespraeche(timestamp DESC);
CREATE INDEX idx_zahlungen_kunde ON zahlungen(kunde_id);
CREATE INDEX idx_zahlungen_status ON zahlungen(status);

ALTER TABLE kunden ENABLE ROW LEVEL SECURITY;
ALTER TABLE dienstleistungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE oeffnungszeiten ENABLE ROW LEVEL SECURITY;
ALTER TABLE gespraeche ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_nachrichten ENABLE ROW LEVEL SECURITY;
ALTER TABLE zahlungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kunden_user_policy" ON kunden FOR ALL USING (user_id = auth.uid());
CREATE POLICY "dienstleistungen_kunde_policy" ON dienstleistungen FOR ALL USING (kunde_id IN (SELECT id FROM kunden WHERE user_id = auth.uid()));
CREATE POLICY "oeffnungszeiten_kunde_policy" ON oeffnungszeiten FOR ALL USING (kunde_id IN (SELECT id FROM kunden WHERE user_id = auth.uid()));
CREATE POLICY "gespraeche_kunde_policy" ON gespraeche FOR ALL USING (kunde_id IN (SELECT id FROM kunden WHERE user_id = auth.uid()));
CREATE POLICY "chat_nachrichten_kunde_policy" ON chat_nachrichten FOR ALL USING (kunde_id IN (SELECT id FROM kunden WHERE user_id = auth.uid()));
CREATE POLICY "zahlungen_kunde_policy" ON zahlungen FOR ALL USING (kunde_id IN (SELECT id FROM kunden WHERE user_id = auth.uid()));

