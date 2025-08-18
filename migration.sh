#!/bin/bash


# 2. Backup project (via Git - cleanest method)
echo "📁 Backing up project via Git..."
cd ~/Documents/startup/oncall-ai
git add -A
git commit -m "Pre-Windows migration backup - $(date)"
git push origin main

# 3. Export environment info
echo "🔧 Exporting environment info..."
echo "Azure Subscription: $(az account show --query name -o tsv)" > ~/Desktop/offcall-ai-windows-migration/azure-info.txt
echo "Resource Group: offcall-ai" >> ~/Desktop/offcall-ai-windows-migration/azure-info.txt
echo "Container Registry: offcaiaicr80017.azurecr.io" >> ~/Desktop/offcall-ai-windows-migration/azure-info.txt
echo "Kubernetes Cluster: offcall-ai-aks" >> ~/Desktop/offcall-ai-windows-migration/azure-info.txt
echo "Domain: offcallai.com" >> ~/Desktop/offcall-ai-windows-migration/azure-info.txt

# 4. Export Docker info
echo "🐳 Exporting Docker info..."
docker images | grep offcall > ~/Desktop/offcall-ai-windows-migration/docker-images.txt

# 5. Export current deployment status
echo "📊 Exporting deployment status..."
kubectl get all -n offcall-ai > ~/Desktop/offcall-ai-windows-migration/k8s-status.txt

# 6. Create quick start script for Windows
cat > ~/Desktop/offcall-ai-windows-migration/windows-setup.md << 'EOF'
# Windows Setup Guide

## 1. Install Tools
- Docker Desktop for Windows
- Node.js 18+
- Python 3.9+
- Git for Windows
- VS Code
- Azure CLI
- kubectl

## 2. Login to Services
```cmd
az login
docker login offcaiaicr80017.azurecr.io