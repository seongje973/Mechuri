# 메추리 API 서버 이미지. Render(render.yaml)나 다른 Docker 호스팅에서 그대로 쓴다.
#   docker build -t mechuri-api backend
#   docker run -p 5000:5000 --env-file backend/.env -e NODE_ENV=production mechuri-api
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY .sequelizerc ./
COPY migrations ./migrations
COPY src ./src

USER node
EXPOSE 5000

# 켤 때마다 밀린 마이그레이션을 먼저 적용한다 (이미 적용된 것은 건너뜀). 실패하면 서버를 띄우지 않는다.
CMD ["sh", "-c", "./node_modules/.bin/sequelize-cli db:migrate && exec node src/app.js"]
