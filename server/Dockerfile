FROM node:22-alpine
WORKDIR /app

ARG DATABASE_URL=postgresql://learners:learners_dev_password@postgres:5432/learners_institute?schema=public
ENV DATABASE_URL=${DATABASE_URL}

COPY package*.json ./
COPY prisma ./prisma
COPY prisma7.config.ts ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 4000
CMD ["npm", "run", "start"]
