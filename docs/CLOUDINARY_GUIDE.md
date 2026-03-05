# Guide de Gestion Cloudinary

## ✅ Corrections Appliquées

### 1. Suppression automatique des images
- ✅ Articles: Images supprimées lors de UPDATE et DELETE
- ✅ Ebooks: Couvertures et PDFs supprimés lors de DELETE
- ✅ Gestion d'erreurs avec try/catch et logs

### 2. Rollback en cas d'erreur
- ✅ Si création d'article échoue, l'image uploadée est supprimée
- ✅ Si update échoue, l'ancienne image est conservée

### 3. Script de nettoyage
- ✅ Script `scripts/cleanup-cloudinary.js` créé
- ✅ Détecte les fichiers orphelins
- ✅ Affiche les statistiques d'utilisation

## 📋 Utilisation

### Vérifier les fichiers orphelins

```bash
cd BACKEND
node scripts/cleanup-cloudinary.js
```

### Supprimer les fichiers orphelins

Décommenter les lignes de suppression dans le script puis relancer.

## 🔍 Monitoring

Accéder à : https://cloudinary.com/console

## 📊 Structure Cloudinary

```
adlam/
├── articles/          # Images d'articles
├── ebooks/
│   ├── covers/        # Couvertures d'ebooks
│   └── pdfs/          # Fichiers PDF
```

## 🔧 Maintenance

### Hebdomadaire
- Vérifier les fichiers orphelins
- Vérifier l'utilisation du quota

### Mensuel
- Nettoyer les fichiers orphelins
- Analyser les statistiques
