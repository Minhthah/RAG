FROM node:20-slim

# Cài ClamAV cho môi trường production
RUN apt-get update && \
    apt-get install -y --no-install-recommends clamav clamav-daemon cron && \
    freshclam || true && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Cronjob: freshclam mỗi đêm 2:00 AM cập nhật virus signature
RUN echo "0 2 * * * /usr/bin/freshclam --quiet" | crontab -

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

# Tạo thư mục quarantine + logs
RUN mkdir -p /app/tmp /app/logs

EXPOSE 3001

# Start cron + app
CMD cron && node src/index.js
