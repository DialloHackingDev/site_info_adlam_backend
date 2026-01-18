#!/bin/bash

echo "🚀 Test du système Adlam Backend"
echo "================================"

# Variables
BASE_URL="http://localhost:5000/api/v1"

echo "📋 Test des endpoints principaux..."

# Test de santé
echo "1. Test de santé du serveur:"
curl -s "$BASE_URL/health" | jq '.'

echo -e "\n2. Test des routes publiques:"

# Test des articles
echo "   - Articles récents:"
curl -s "$BASE_URL/articles/recent?limit=3" | jq '.status'

# Test des ebooks
echo "   - Ebooks récents:"
curl -s "$BASE_URL/ebooks/recent?limit=3" | jq '.status'

# Test des documents
echo "   - Documents récents:"
curl -s "$BASE_URL/documents/recent?limit=3" | jq '.status'

# Test de la boutique
echo "   - Informations boutique:"
curl -s "$BASE_URL/shop" | jq '.status'

echo -e "\n✅ Tests terminés!"
echo "📝 Pour tester l'authentification:"
echo "   POST $BASE_URL/auth/register"
echo "   Body: {\"name\": \"Test User\", \"email\": \"test@example.com\", \"password\": \"password123\"}"
echo ""
echo "📝 Pour accéder au dashboard admin (après connexion en tant qu'admin):"
echo "   GET $BASE_URL/admin/dashboard"
echo "   Header: Authorization: Bearer <token>"