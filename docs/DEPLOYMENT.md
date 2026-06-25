# NutriCan PT - Deployment Guide

## 1. Prerequisites

### 1.1 System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Storage | 20 GB | 50+ GB |
| OS | Ubuntu 20.04 / Windows Server 2019 / macOS 12+ |

### 1.2 Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Java JDK | 17+ | Backend runtime |
| Node.js | 18+ | Frontend build |
| Maven | 3.9+ | Backend build |
| Docker | 24+ | Container runtime |
| Docker Compose | 2.20+ | Service orchestration |
| Git | 2.40+ | Version control |

---

## 2. Local Development Setup

### 2.1 Clone Repository

```bash
git clone <repository-url>
cd nutrican-pt-workspace
```

### 2.2 Environment Variables

Create a `.env` file in the backend directory:

```bash
cd nutrican-be
cat > .env << EOF
# Database
POSTGRES_DB=nutrican_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password

# JWT Configuration
JWT_SECRET_KEY=your_very_long_secret_key_at_least_256_bits_long
JWT_EXPIRATION_MS=3600000

# MinIO Configuration
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin_password
MINIO_BUCKET_NAME=nutrican

# Server
SERVER_PORT=8080

# Ollama
OLLAMA_PORT=11434
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001
EOF
```

### 2.3 Start Infrastructure Services

```bash
cd nutrican-be
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- MinIO on ports 9000 (API), 9001 (Console)
- Ollama on port 11434

### 2.4 Verify Services

```bash
# Check PostgreSQL
psql -h localhost -U postgres -d nutrican_db -c "SELECT version();"

# Check MinIO
curl http://localhost:9000/minio/health/live

# Check Ollama
curl http://localhost:11434/api/tags
```

### 2.5 Build and Run Backend

```bash
cd nutrican-be

# Build
./mvnw clean package -DskipTests

# Run
./mvnw spring-boot:run
```

Backend will be available at `http://localhost:8080`

### 2.6 Build and Run Frontend

```bash
cd nutrican-fe

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=http://localhost:8080/api/v1
EOF

# Run development server
npm run dev
```

Frontend will be available at `http://localhost:5173`

---

## 3. Production Deployment

### 3.1 Server Setup

#### 3.1.1 Update System

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
    openjdk-17-jdk \
    nodejs \
    npm \
    maven \
    docker.io \
    docker-compose \
    nginx \
    certbot
```

#### 3.1.2 Configure Firewall

```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80     # HTTP
sudo ufw allow 443    # HTTPS
sudo ufw allow 9000   # MinIO API
sudo ufw allow 9001   # MinIO Console
sudo ufw enable
```

### 3.2 Directory Structure

```bash
/opt/nutrican/
├── backend/
│   ├── nutican-be/
│   ├── .env
│   └── application.jar
├── frontend/
│   ├── nutican-fe/
│   └── dist/
├── nginx/
│   └── nginx.conf
└── ssl/
    ├── fullchain.pem
    └── privkey.pem
```

### 3.3 Build Production Artifacts

```bash
# Build Backend
cd /opt/nutrican/backend/nutican-be
./mvnw clean package -DskipTests
cp target/nutrican-be-*.jar ../application.jar

# Build Frontend
cd /opt/nutrican/frontend/nutican-fe
npm install
npm run build
cp -r dist/* /opt/nutrican/frontend/
```

### 3.4 Nginx Configuration

```nginx
# /etc/nginx/sites-available/nutrican

upstream backend {
    server 127.0.0.1:8080;
}

server {
    listen 80;
    server_name api.nutrican.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.nutrican.com;

    ssl_certificate /opt/nutrican/ssl/fullchain.pem;
    ssl_certificate_key /opt/nutrican/ssl/privkey.pem;

    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Swagger UI
    location /swagger-ui/ {
        proxy_pass http://backend;
    }

    location /v3/api-docs/ {
        proxy_pass http://backend;
    }
}

server {
    listen 80;
    server_name nutrican.com www.nutrican.com;

    root /opt/nutrican/frontend;
    index index.html;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name nutrican.com www.nutrican.com;

    ssl_certificate /opt/nutrican/ssl/fullchain.pem;
    ssl_certificate_key /opt/nutrican/ssl/privkey.pem;

    root /opt/nutrican/frontend;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3.5 SSL Certificate

```bash
# Obtain SSL certificate
sudo certbot --nginx -d nutrican.com -d www.nutrican.com -d api.nutrican.com

# Auto-renewal (should be automatic, but verify)
sudo certbot renew --dry-run
```

### 3.6 Systemd Services

#### Backend Service

```ini
# /etc/systemd/system/nutrican-backend.service

[Unit]
Description=NutriCan PT Backend
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/nutrican/backend
EnvironmentFile=/opt/nutrican/backend/.env
ExecStart=/usr/bin/java -jar /opt/nutrican/backend/application.jar
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### Enable Services

```bash
sudo systemctl daemon-reload
sudo systemctl enable nutrican-backend
sudo systemctl start nutrican-backend
sudo systemctl enable nginx
sudo systemctl restart nginx
```

---

## 4. Docker Compose Production

### 4.1 Production docker-compose.yml

```yaml
# nutrican-be/docker-compose.prod.yml

version: '3.9'

networks:
  nutrican-network:
    driver: bridge

volumes:
  postgres_data:
    driver: local
  minio_data:
    driver: local

services:
  postgres:
    image: postgres:17-alpine
    container_name: nutrican-postgres
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - nutrican-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: nutrican-minio
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    networks:
      - nutrican-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  minio-init:
    image: minio/mc:latest
    container_name: nutrican-minio-init
    depends_on:
      minio:
        condition: service_healthy
    networks:
      - nutrican-network
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
      MINIO_BUCKET_NAME: ${MINIO_BUCKET_NAME}
    volumes:
      - ./minio-init.sh:/minio-init.sh:ro
    entrypoint: ["/bin/sh", "/minio-init.sh"]
    restart: "no"

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: nutrican-backend
    environment:
      SPRING_PROFILES_ACTIVE: prod
    env_file:
      - .env
    ports:
      - "8080:8080"
    networks:
      - nutrican-network
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
```

### 4.2 Backend Dockerfile

```dockerfile
# nutrican-be/Dockerfile

FROM eclipse-temurin:17-jdk-alpine as builder

WORKDIR /app

COPY pom.xml .
COPY nutritiontrack-module-core ./nutritiontrack-module-core
COPY nutritiontrack-module-auth ./nutritiontrack-module-auth
COPY nutritiontrack-module-user-profile ./nutritiontrack-module-user-profile
COPY nutritiontrack-module-diet-tracker ./nutritiontrack-module-diet-tracker
COPY nutritiontrack-module-ai-gateway ./nutritiontrack-module-ai-gateway
COPY nutritiontrack-module-pt-management ./nutritiontrack-module-pt-management
COPY nutritiontrack-module-admin ./nutritiontrack-module-admin
COPY nutritiontrack-module-application ./nutritiontrack-module-application

RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY --from=builder /app/nutritiontrack-module-application/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

## 5. Database Setup

### 5.1 Initialize Database

```bash
# Connect to PostgreSQL
psql -h localhost -U postgres -d postgres

# Create database
CREATE DATABASE nutrican_db;

# Create user (optional)
CREATE USER nutrican_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE nutrican_db TO nutrican_user;
```

### 5.2 Database Migrations

The application uses Hibernate auto-ddl for schema management. For production:

```properties
# application.properties
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.properties.jakarta.persistence.schema-generation.database.action=none
```

### 5.3 Backup

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/var/backups/nutrican
mkdir -p $BACKUP_DIR

pg_dump -h localhost -U postgres nutrican_db | gzip > $BACKUP_DIR/postgres_$DATE.sql.gz

# Keep last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

---

## 6. MinIO Setup

### 6.1 Create Bucket

```bash
# Using mc client
mc alias set myminio http://localhost:9000 minioadmin minioadmin_password
mc mb myminio/nutrican
mc anonymous set public myminio/nutrican
```

### 6.2 Bucket Policies

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::nutrican/*"]
    },
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:PutObject"],
      "Resource": ["arn:aws:s3:::nutrican/*"]
    }
  ]
}
```

---

## 7. Ollama Setup

### 7.1 Pull AI Model

```bash
# Install Ollama (if not using Docker)
curl -fsSL https://ollama.com/install.sh | sh

# Pull vision model
ollama pull qwen2.5-vl

# Verify
ollama list
```

### 7.2 GPU Support (Optional)

```yaml
# docker-compose.yml
services:
  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

---

## 8. Monitoring & Logging

### 8.1 Health Checks

```bash
# Backend health
curl http://localhost:8080/actuator/health

# PostgreSQL
pg_isready -h localhost -U postgres

# MinIO
curl http://localhost:9000/minio/health/live
```

### 8.2 Log Locations

| Service | Log Location |
|---------|--------------|
| Backend | Console / journalctl |
| PostgreSQL | Docker logs / var/log/postgresql |
| MinIO | Docker logs |
| Nginx | /var/log/nginx |

### 8.3 Monitoring Commands

```bash
# View backend logs
docker logs nutrican-backend --tail 100 -f

# View database logs
docker logs nutrican-postgres --tail 100 -f

# System resources
docker stats
```

---

## 9. Troubleshooting

### 9.1 Common Issues

#### Database Connection Failed

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection
psql -h localhost -U postgres -d nutrican_db

# Check logs
docker logs nutrican-postgres
```

#### MinIO Upload Failed

```bash
# Check MinIO is running
docker ps | grep minio

# Check bucket exists
mc ls myminio/

# Check credentials
mc alias list
```

#### Ollama Model Not Found

```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Pull model
ollama pull qwen2.5-vl

# Check available models
ollama list
```

#### JWT Token Invalid

```bash
# Check JWT secret in .env
cat .env | grep JWT

# Restart backend after changing secret
sudo systemctl restart nutrican-backend
```

### 9.2 Reset Development Environment

```bash
# Stop all containers
cd nutrican-be
docker-compose down -v

# Remove all data
rm -rf postgres_data minio_data

# Restart
docker-compose up -d

# Rebuild backend
./mvnw clean package -DskipTests
./mvnw spring-boot:run
```

---

## 10. Security Checklist

- [ ] Change default passwords
- [ ] Use strong JWT secret (256+ bits)
- [ ] Enable HTTPS in production
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Enable MinIO bucket policies
- [ ] Use environment variables for secrets
- [ ] Disable debug mode in production
- [ ] Set appropriate file upload limits
- [ ] Configure CORS for production domains

---

## 11. Performance Optimization

### 11.1 JVM Settings

```bash
java -Xms512m -Xmx2g \
     -XX:+UseG1GC \
     -XX:MaxGCPauseMillis=200 \
     -jar application.jar
```

### 11.2 Database Connection Pool

```properties
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000
```

### 11.3 CDN for Static Assets

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    proxy_pass http://cdn-backend;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

*Document Version: 2.0.0*
*Last Updated: 2026-06-04*
