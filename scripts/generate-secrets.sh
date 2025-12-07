#!/bin/bash

# Generate Secure Secrets Script
# This script generates secure random secrets for use in .env file

echo "🔐 Generating Secure Secrets for Fit-Check..."
echo ""
echo "Copy these values to your deployed/.env file"
echo "=========================================="
echo ""

# Generate JWT Secret
JWT_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET=$JWT_SECRET"
echo ""

# Generate MongoDB Username
MONGO_USER=$(openssl rand -hex 12)
echo "MONGO_INITDB_ROOT_USERNAME=$MONGO_USER"
echo ""

# Generate MongoDB Password
MONGO_PASSWORD=$(openssl rand -base64 24)
echo "MONGO_INITDB_ROOT_PASSWORD=$MONGO_PASSWORD"
echo ""

# Show DB_URL format
echo "DB_URL=mongodb://$MONGO_USER:$MONGO_PASSWORD@mongo:27017/fit-check?authSource=admin"
echo ""

echo "=========================================="
echo ""
echo "⚠️  IMPORTANT:"
echo "1. Save these values in deployed/.env"
echo "2. NEVER commit .env to version control"
echo "3. Keep these secrets secure"
echo "4. Rotate secrets regularly"
echo ""

