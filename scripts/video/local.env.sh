# Local, disposable stack for the walkthrough: source this BEFORE starting the second backend / alembic / seed.
# Overrides backend/.env (environment variables win over the .env file), so the hosted Supabase/Upstash are never contacted.
# The Postgres/Redis credentials are the throwaway ones from docker-compose.yml.
export DATABASE_URL="postgresql://sentinel:sentinel@127.0.0.1:5432/sentinel_db"
export REDIS_URL="redis://127.0.0.1:6379"
export FRONTEND_ORIGIN="http://localhost:5174"
export SENTINEL_URL="http://localhost:5174"
