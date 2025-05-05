# Étape 1 : build des dépendances
FROM python:3.11-slim AS builder

WORKDIR /app

# Dépendances système nécessaires à la compilation (pour numpy/scikit-learn)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Installer Poetry
RUN pip install --no-cache-dir poetry

# Copier uniquement les fichiers de dépendances
COPY pyproject.toml poetry.lock* ./

# Désactiver la création de virtualenv
RUN poetry config virtualenvs.create false

# Installer uniquement les dépendances (pas le projet lui-même)
RUN poetry install --only main --no-interaction --no-ansi

# Étape 2 : image finale légère
FROM python:3.11-slim

WORKDIR /app

# Installer seulement ce qui est nécessaire pour exécuter (si besoin)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copier les libs Python installées depuis l’image builder
COPY --from=builder /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=builder /usr/local/bin /usr/local/bin

# Copier le code source
COPY . .

# Lancer le service avec Poetry
CMD ["poetry", "run", "uvicorn", "ai_service.main:app", "--host", "0.0.0.0", "--port", "8000"]
