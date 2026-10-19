# A imagem do LibreOffice para o slides/build-v2.mjs --png (so o organizador):
#   docker build --platform linux/amd64 -t ws-libreoffice slides/libreoffice
# A base e a imagem do PowerShell dos testes Pester (CLAUDE.md), que ja esta em cache; o LibreOffice do Alpine fica
# parado no arranque (D-36).
FROM mcr.microsoft.com/powershell:7.4-ubuntu-22.04
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends libreoffice-impress fonts-dejavu fonts-liberation && rm -rf /var/lib/apt/lists/*
