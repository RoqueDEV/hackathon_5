-- WMO Zorgagent — Database initialisatie.
-- Alleen pgvector extensie. Tabellen worden door de backend aangemaakt via
-- SQLAlchemy Base.metadata.create_all() bij startup, zodat er één bron van
-- waarheid is voor het schema (de ORM-modellen in backend/app/models/db_models.py).

CREATE EXTENSION IF NOT EXISTS vector;

-- Optionele vectorstore tabel voor toekomstige RAG-hooks op beleidsregels.
CREATE TABLE IF NOT EXISTS policy_embeddings (
    id BIGSERIAL PRIMARY KEY,
    provision_type TEXT NOT NULL,
    chunk TEXT NOT NULL,
    embedding vector(384),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
