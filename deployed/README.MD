# Deployment Guide 🚀

This guide walks you through deploying the Fit-Check application on an AWS EC2 instance with Docker and SSL.

## Prerequisites

- AWS Account
- Domain name (e.g., from NameCheap)
- SSH access to your server

---

## Step 0: Build & Push Docker Images (Mac Users)

**⚠️ Note:** If you're building on Mac (ARM64), you need to build for Linux (AMD64) architecture.

### Build and push frontend image

```bash
docker buildx build --platform linux/amd64 -t ishnoopy/fit-check-frontend:latest --push ./frontend
```

### Build and push backend image

```bash
docker buildx build --platform linux/amd64 -t ishnoopy/fit-check-backend:latest --push ./backend
```

### Verify the images

```bash
# Check backend image
docker buildx imagetools inspect ishnoopy/fit-check-backend:latest

# Check frontend image
docker buildx imagetools inspect ishnoopy/fit-check-frontend:latest
```

---

## Step 1: Setup EC2 Instance

### 1.1 Configure Security Rules

1. Launch an EC2 instance (Ubuntu recommended)
2. Navigate to **Security Groups** > **Inbound Rules**
3. Add the following rules:
   - **Port 22** (SSH)
   - **Port 80** (HTTP)
   - **Port 443** (HTTPS)

### 1.2 Install Docker & Docker Compose

SSH into your instance and run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker prerequisites
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker's official GPG key and repository
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep -Po '"tag_name": "\K.*?(?=")')
sudo curl -L "https://github.com/docker/compose/releases/download/$DOCKER_COMPOSE_VERSION/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Enable and start Docker
sudo systemctl enable docker
sudo systemctl start docker

# Add your user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker run hello-world
```

**⚠️ Important:** Log out and log back in for group permissions to take effect.

---

## Step 2: Configure DNS

1. Go to your domain provider (e.g., **NameCheap**)
2. Navigate to **Domain List** > **Manage** > **Advanced DNS**
3. Add an **A Record**:
   - **Host:** `@` (or your subdomain)
   - **Value:** Your EC2 instance's public IPv4 address
   - **TTL:** Automatic

---

## Step 3: Setup Application Files

### 3.1 Create Directory Structure

```bash
mkdir -p ~/app/fit-check/nginx/{conf.d,certs,certbot}
cd ~/app/fit-check
```

### 3.2 Create Environment File

```bash
nano .env
```

Copy the contents from `deployed/env.template` and fill in the values:

- Run `sh scripts/generate-secrets.sh` locally to generate secure secrets
- Update all placeholder values in `.env`

### 3.3 Create Docker Compose File

```bash
nano docker-compose.yml
```

Copy the contents from `deployed/docker-compose.yml`

### 3.4 Create Initial Nginx Configuration

```bash
nano nginx/conf.d/fit-check.conf
```

Copy the contents from `deployed/nginx.conf` (this is for initial setup without SSL)

---

## Step 4: Deploy & Install SSL

### 4.1 Start Services

```bash
docker-compose up -d
```

### 4.2 Install SSL Certificate

```bash
docker compose run --rm certbot
```

Follow the prompts to install Let's Encrypt SSL certificate.

### 4.3 Update Nginx for HTTPS

```bash
nano nginx/conf.d/fit-check.conf
```

Replace the contents with `deployed/nginx-after-installing-ssl.conf`

### 4.4 Reload Nginx

```bash
docker exec -it nginx nginx -s reload
```

---

## 🎉 Done

Your application should now be running at `https://yourdomain.com`

## Troubleshooting

- **Check logs:** `docker-compose logs -f`
- **Restart services:** `docker-compose restart`
- **SSL renewal:** Certbot auto-renews, but you can manually run: `docker compose run --rm certbot renew`
