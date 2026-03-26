FROM python:3.13-slim

WORKDIR /app

# Dépendances système pour rasterio
RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Installer uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copier les fichiers de config du projet
COPY pyproject.toml .
COPY uv.lock .
COPY README.md .

# Installer les dépendances
RUN uv sync --frozen --no-dev

# Copier le code backend
COPY backend/ ./backend/

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
