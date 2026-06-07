# Deployment Guide

This guide walks you through deploying the application on an AWS EC2 instance using Docker and Caddy (which handles HTTPS automatically), and automating future deployments via GitHub Actions.

## Prerequisites

- AWS account with an EC2 instance (Ubuntu recommended)
- A domain name with an A record pointing to your EC2 public IP
- DNS fully propagated before starting — check with [dnschecker.org](https://dnschecker.org)

---

## Step 0: Build & Push Docker Images

If you're building on Mac (Apple Silicon), you need to target Linux AMD64 explicitly.

```bash
# Frontend
docker buildx build --platform linux/amd64 -t ishnoopy/fit-check-frontend:latest --push ./frontend

# Backend
docker buildx build --platform linux/amd64 -t ishnoopy/fit-check-backend:latest --push ./backend

# Verify
docker buildx imagetools inspect ishnoopy/fit-check-frontend:latest
docker buildx imagetools inspect ishnoopy/fit-check-backend:latest
```

---

## Step 1: Setup EC2 Instance

### 1.1 Configure Security Group Inbound Rules

| Port | Protocol | Purpose |
|------|----------|---------|
| 22   | TCP      | SSH     |
| 80   | TCP      | HTTP (required for SSL challenge) |
| 443  | TCP      | HTTPS   |

### 1.2 Install Docker

SSH into your instance and run:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep -Po '"tag_name": "\K.*?(?=")')
sudo curl -L "https://github.com/docker/compose/releases/download/$DOCKER_COMPOSE_VERSION/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
newgrp docker
```

Log out and back in for group permissions to take effect.

---

## Step 2: Whitelist VPS IP in MongoDB Atlas

1. Go to [MongoDB Atlas](https://cloud.mongodb.com) and open your project
2. Navigate to **Security > Network Access**
3. Click **Add IP Address**
4. Enter your EC2 public IP address
5. Click **Confirm**

Without this, the backend will fail to connect to the database.

---

## Step 4: Configure DNS

In your domain provider (e.g. Namecheap), add an A record:

- **Host:** `@` or your subdomain
- **Value:** EC2 public IPv4 address
- **TTL:** Automatic

Wait for DNS to propagate before proceeding.

---

## Step 5: Setup Application Files on the Server

```bash
mkdir -p ~/app/fit-check && cd ~/app/fit-check
```

Create the three required files:

```bash
nano .env
```
Copy `deployed/env.template` and fill in all values.

```bash
nano docker-compose.yml
```
Copy the contents of `deployed/docker-compose.yml`.

```bash
nano Caddyfile
```
Copy the contents of `deployed/Caddyfile`.

---

## Step 6: Deploy

Before starting, confirm your domain is fully propagated — check with [dnschecker.org](https://dnschecker.org). Caddy requests an SSL certificate on first start and will fail if the domain doesn't resolve to your server yet.

```bash
docker compose up -d
```

Caddy will automatically obtain and configure a Let's Encrypt SSL certificate on first start. No manual SSL setup needed.

To check logs:
```bash
docker compose logs -f caddy
```

---

## Step 7: Automated Deployment with GitHub Actions

The workflow in `.github/workflows/ci.yml` automatically deploys on push to `main` via SSH.

Add these secrets in **GitHub > Settings > Secrets and variables > Actions**:

| Secret | Value |
|--------|-------|
| `EC2_HOST` | EC2 public IP or DNS |
| `EC2_USERNAME` | SSH username (e.g. `ubuntu`) |
| `EC2_KEY` | Contents of your `.pem` private key file |

---

## Troubleshooting

```bash
# View all logs
docker compose logs -f

# Restart all services
docker compose restart

# Check Caddy specifically
docker compose logs caddy
```
