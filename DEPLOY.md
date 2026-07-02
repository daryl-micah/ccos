# CCOS Deployment Guide — Digital Ocean Droplet

Deploy CCOS to a Digital Ocean droplet with domain `ccos.darylmicah.me`.

---

## Prerequisites

- **Digital Ocean droplet**: 2GB RAM, 50GB SSD, Ubuntu 22.04/24.04
- **Domain**: `ccos.darylmicah.me` with DNS A record pointing to droplet IP
- **Local**: Git repo access and SSH key configured for the droplet

---

## Part 1: Server Setup

### 1.1 Connect to Droplet

```bash
ssh root@168.144.81.111
```

### 1.2 Install Docker & Docker Compose

```bash
# Update packages
apt update && apt upgrade -y

# Install Docker
apt install -y docker.io docker-compose git

# Enable Docker service
systemctl enable docker
systemctl start docker

# Verify installation
docker --version
docker-compose --version
```

### 1.3 Install Nginx (Reverse Proxy)

```bash
apt install -y nginx certbot python3-certbot-nginx

# Stop nginx temporarily (we'll configure it next)
systemctl stop nginx
```

---

## Part 2: Deploy CCOS

### 2.1 Clone Repository

```bash
cd /opt
git clone <your-repo-url> ccos
cd ccos
```

### 2.2 Configure Environment Variables

#### API Configuration

```bash
cd /opt/ccos/apps/api
cp .env.example .env
nano .env
```

Update `.env` with:

```bash
# Database (container network)
DATABASE_URL=postgresql+asyncpg://ccos:ccos@postgres:5432/ccos

# Redis
REDIS_URL=redis://redis:6379/0

# App
ENV=production
API_V1_PREFIX=/api/v1
CORS_ORIGINS=https://ccos.darylmicah.me

# Instagram (optional - configure later if needed)
# INSTAGRAM_USERNAME=
# INSTAGRAM_PASSWORD=
# INSTAGRAM_SESSIONID=

# AI / Groq (optional - add your key to enable AI features)
# GROQ_API_KEY=your-groq-api-key
# GROQ_MODEL=llama-3.3-70b-versatile
```

### 2.3 Update Docker Compose

Edit `/opt/ccos/docker-compose.yml`:

```bash
nano /opt/ccos/docker-compose.yml
```

Update these sections:

**API service** - change CORS_ORIGINS:
```yaml
  api:
    # ... existing config ...
    environment:
      DATABASE_URL: postgresql+asyncpg://ccos:ccos@postgres:5432/ccos
      REDIS_URL: redis://redis:6379/0
      CORS_ORIGINS: https://ccos.darylmicah.me
      ENV: production
    # Remove or comment out the ports section - nginx will proxy instead
    # ports:
    #   - "8000:8000"
```

**Web service** - update API URL build arg:
```yaml
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      args:
        NEXT_PUBLIC_API_URL: https://ccos.darylmicah.me/api/v1
    # Remove or comment out the ports section - nginx will proxy instead
    # ports:
    #   - "3000:3000"
```

**Postgres** - optionally expose only to localhost (more secure):
```yaml
  postgres:
    # ... existing config ...
    ports:
      - "127.0.0.1:5432:5432"  # Only localhost access
```

**Redis** - same for Redis:
```yaml
  redis:
    # ... existing config ...
    ports:
      - "127.0.0.1:6379:6379"  # Only localhost access
```

### 2.4 Build and Start Services

```bash
cd /opt/ccos
docker-compose up -d --build
```

This will:
- Build API, Web, Worker, and Beat images
- Start Postgres and Redis
- Run database migrations
- Start all services

**Check status:**
```bash
docker-compose ps
docker-compose logs -f --tail=50
```

All services should show "healthy" or "running". Press `Ctrl+C` to exit logs.

---

## Part 3: Nginx Reverse Proxy & SSL

### 3.1 Configure Nginx

Create nginx config:

```bash
nano /etc/nginx/sites-available/ccos
```

Add this configuration:

```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name ccos.darylmicah.me;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ccos.darylmicah.me;

    # SSL certificates (will be created by certbot)
    ssl_certificate /etc/letsencrypt/live/ccos.darylmicah.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ccos.darylmicah.me/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Max upload size (for Excel imports)
    client_max_body_size 50M;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:8000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3.2 Enable Site

```bash
# Create symlink
ln -s /etc/nginx/sites-available/ccos /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t
```

### 3.3 Obtain SSL Certificate

**First, temporarily expose ports for certbot:**

```bash
nano /opt/ccos/docker-compose.yml
```

Add back the ports for initial setup:
```yaml
  api:
    ports:
      - "127.0.0.1:8000:8000"  # localhost only

  web:
    ports:
      - "127.0.0.1:3000:3000"  # localhost only
```

```bash
cd /opt/ccos
docker-compose up -d
```

**Now get the certificate:**

```bash
# Obtain certificate
certbot --nginx -d ccos.darylmicah.me

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Optionally share email with EFF
# - Certificate will be installed automatically
```

### 3.4 Start Nginx

```bash
systemctl start nginx
systemctl enable nginx
systemctl status nginx
```

### 3.5 Verify Deployment

Open browser and navigate to:
- **https://ccos.darylmicah.me** — should show CCOS dashboard
- **https://ccos.darylmicah.me/api/v1/health** — should return `{"status":"ok","env":"production"}`

---

## Part 4: Post-Deployment

### 4.1 Set Up Auto-Renewal for SSL

Certbot auto-renewal is already configured. Test it:

```bash
certbot renew --dry-run
```

### 4.2 Configure Firewall (UFW)

```bash
# Enable firewall
ufw default deny incoming
ufw default allow outgoing

# Allow SSH, HTTP, HTTPS
ufw allow OpenSSH
ufw allow 'Nginx Full'

# Enable
ufw enable
ufw status
```

### 4.3 Set Up Automatic Updates (Optional)

```bash
apt install -y unattended-upgrades
dpkg-reconfigure --priority=low unattended-upgrades
```

### 4.4 Database Backups

Create backup script:

```bash
mkdir -p /opt/backups
nano /opt/backups/backup-ccos-db.sh
```

Add:

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/ccos_backup_$DATE.sql.gz"

# Backup database from running container
docker exec ccos-postgres pg_dump -U ccos ccos | gzip > "$BACKUP_FILE"

# Keep only last 7 days
find $BACKUP_DIR -name "ccos_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
```

Make executable and add to cron:

```bash
chmod +x /opt/backups/backup-ccos-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
```

Add line:
```
0 2 * * * /opt/backups/backup-ccos-db.sh >> /var/log/ccos-backup.log 2>&1
```

---

## Part 5: Maintenance Commands

### View Logs

```bash
# All services
cd /opt/ccos
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f worker
docker-compose logs -f beat

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Restart Services

```bash
cd /opt/ccos

# Restart all
docker-compose restart

# Restart specific service
docker-compose restart api
docker-compose restart web
```

### Update Application

```bash
cd /opt/ccos

# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Check status
docker-compose ps
docker-compose logs -f --tail=50
```

### Database Access

```bash
# Connect to PostgreSQL
docker exec -it ccos-postgres psql -U ccos -d ccos

# Restore from backup
gunzip < /opt/backups/ccos_backup_20260702_020000.sql.gz | docker exec -i ccos-postgres psql -U ccos -d ccos
```

### Health Checks

```bash
# API health
curl http://localhost:8000/health

# Container stats
docker stats

# Disk usage
df -h
docker system df
```

---

## Troubleshooting

### Service won't start

```bash
cd /opt/ccos
docker-compose logs <service-name>
```

### Out of memory

Reduce worker concurrency in `docker-compose.yml`:
```yaml
worker:
  command: celery -A app.worker.celery_app worker --loglevel=info --concurrency=1
```

Then restart:
```bash
docker-compose up -d worker
```

### Database migration issues

```bash
# Run migrations manually
docker exec -it ccos-api uv run alembic upgrade head
```

### SSL renewal fails

```bash
# Check certbot logs
cat /var/log/letsencrypt/letsencrypt.log

# Manual renewal
certbot renew --force-renewal
nginx -s reload
```

### Clear Docker resources

```bash
# Remove unused images/containers
docker system prune -a

# Remove volumes (WARNING: deletes data!)
docker-compose down -v
```

---

## Configuration Checklist

- [ ] Droplet created with SSH key
- [ ] DNS A record for `ccos.darylmicah.me` pointing to droplet IP
- [ ] Docker and Docker Compose installed
- [ ] Repository cloned to `/opt/ccos`
- [ ] `.env` file configured in `apps/api/`
- [ ] `docker-compose.yml` updated with domain and CORS
- [ ] Services started with `docker-compose up -d`
- [ ] Nginx installed and configured
- [ ] SSL certificate obtained via certbot
- [ ] Firewall (UFW) configured
- [ ] Database backups scheduled
- [ ] Application accessible at https://ccos.darylmicah.me

---

## Support

For issues specific to CCOS, check:
- Application logs: `docker-compose logs -f`
- API health: https://ccos.darylmicah.me/api/v1/health
- [PRODUCT.md](PRODUCT.md) for feature documentation
- [README.md](README.md) for architecture details
