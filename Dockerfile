# Multi-stage production build for EduTrack Ilmziyo
FROM node:20-alpine AS builder
WORKDIR /app

ARG VITE_APP_NAME="EduTrackIlmziyo"
ARG VITE_SUPABASE_URL="http://supabasekong-hpuzpikkxuolobd2zwkpcepk.62.171.143.55.sslip.io"
ARG VITE_SUPABASE_ANON_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4OTcxMDQyMCwiZXhwIjo0OTQ1Mzg0MDIwLCJyb2xlIjoiYW5vbiJ9.s2Tm88Uoi2pDHoZgK-1qMqji07mgEFd9-qe86YvrRfs"

ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
