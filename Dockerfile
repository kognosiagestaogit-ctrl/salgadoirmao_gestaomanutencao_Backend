# Use a imagem oficial do Bun
FROM oven/bun:1 as base
WORKDIR /usr/src/app

# Cache das dependências para acelerar o build
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Instala apenas as dependências de produção
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Release: Copia os arquivos necessários para rodar
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY . .

# Roda a aplicação com usuário não-root por segurança
USER bun

# O comando para iniciar a aplicação
ENTRYPOINT [ "bun", "run", "src/index.ts" ]
