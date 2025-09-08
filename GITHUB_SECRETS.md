# 🔐 Configuration des Secrets GitHub pour le Pipeline CI/CD

Ce document explique comment configurer les secrets GitHub nécessaires pour le pipeline CI/CD de la plateforme E-DEFENCE Audit.

## 📋 Secrets Requis

### 1. **DOCKER_USERNAME**
- **Description** : Nom d'utilisateur Docker Hub
- **Type** : String
- **Exemple** : `mon-username-docker`

### 2. **DOCKER_PASSWORD**
- **Description** : Mot de passe ou token d'accès Docker Hub
- **Type** : Secret
- **Exemple** : `dckr_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 3. **PROD_HOST**
- **Description** : Adresse IP ou nom de domaine du serveur de production
- **Type** : String
- **Exemple** : `192.168.1.100` ou `audit.e-defence.bf`

### 4. **PROD_USERNAME**
- **Description** : Nom d'utilisateur SSH pour le serveur de production
- **Type** : String
- **Exemple** : `deploy` ou `ubuntu`

### 5. **PROD_SSH_KEY**
- **Description** : Clé SSH privée pour accéder au serveur de production
- **Type** : Secret
- **Format** : Clé SSH privée complète (avec les lignes BEGIN et END)

### 6. **SLACK_WEBHOOK**
- **Description** : URL du webhook Slack pour les notifications
- **Type** : Secret
- **Format** : `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`

## 🔧 Configuration des Secrets

### Étape 1 : Accéder aux Secrets GitHub
1. Allez dans votre repository GitHub
2. Cliquez sur **Settings** (Paramètres)
3. Dans le menu de gauche, cliquez sur **Secrets and variables** → **Actions**

### Étape 2 : Ajouter les Secrets
Pour chaque secret ci-dessus :

1. Cliquez sur **New repository secret**
2. Entrez le **Name** (nom du secret)
3. Entrez la **Value** (valeur du secret)
4. Cliquez sur **Add secret**

### Étape 3 : Vérification
Après avoir ajouté tous les secrets, votre liste devrait ressembler à ceci :

```
DOCKER_USERNAME          [Configured]
DOCKER_PASSWORD          [Configured]
PROD_HOST               [Configured]
PROD_USERNAME           [Configured]
PROD_SSH_KEY            [Configured]
SLACK_WEBHOOK           [Configured]
```

## 🐳 Configuration Docker Hub

### Créer un Token d'Accès Docker Hub
1. Connectez-vous à [Docker Hub](https://hub.docker.com)
2. Allez dans **Account Settings** → **Security**
3. Cliquez sur **New Access Token**
4. Donnez un nom au token (ex: `github-actions`)
5. Copiez le token généré
6. Utilisez ce token comme valeur pour `DOCKER_PASSWORD`

## 🔑 Configuration SSH

### Générer une Clé SSH pour le Déploiement
```bash
# Générer une nouvelle clé SSH
ssh-keygen -t ed25519 -C "github-actions@e-defence.bf" -f ~/.ssh/github_actions

# Afficher la clé privée (à copier dans PROD_SSH_KEY)
cat ~/.ssh/github_actions

# Afficher la clé publique (à ajouter sur le serveur)
cat ~/.ssh/github_actions.pub
```

### Ajouter la Clé Publique sur le Serveur
```bash
# Sur le serveur de production
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI..." >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## 📱 Configuration Slack

### Créer un Webhook Slack
1. Allez dans votre workspace Slack
2. Créez une nouvelle app ou utilisez une existante
3. Activez les **Incoming Webhooks**
4. Créez un nouveau webhook
5. Copiez l'URL du webhook
6. Utilisez cette URL comme valeur pour `SLACK_WEBHOOK`

## 🧪 Test de la Configuration

### Vérifier les Secrets
```bash
# Dans un workflow GitHub Actions, vous pouvez tester avec :
echo "Testing secrets configuration..."
echo "Docker username: ${{ secrets.DOCKER_USERNAME }}"
echo "Production host: ${{ secrets.PROD_HOST }}"
```

### Déclencher un Test
1. Faites un push sur la branche `main`
2. Vérifiez que le pipeline CI/CD se lance
3. Surveillez les logs pour détecter les erreurs de secrets

## 🔒 Sécurité

### Bonnes Pratiques
- ✅ Utilisez des tokens d'accès au lieu de mots de passe
- ✅ Limitez les permissions des tokens
- ✅ Régénérez régulièrement les clés SSH
- ✅ Utilisez des clés SSH dédiées pour le déploiement
- ✅ Surveillez les accès et les logs

### Rotation des Secrets
- **Docker tokens** : Tous les 90 jours
- **Clés SSH** : Tous les 6 mois
- **Webhooks Slack** : Selon les besoins

## 🚨 Dépannage

### Erreurs Courantes

#### "Invalid credentials"
- Vérifiez que `DOCKER_USERNAME` et `DOCKER_PASSWORD` sont corrects
- Assurez-vous que le token Docker Hub est valide

#### "Permission denied (publickey)"
- Vérifiez que `PROD_SSH_KEY` contient la clé privée complète
- Assurez-vous que la clé publique est sur le serveur
- Vérifiez les permissions SSH sur le serveur

#### "Webhook URL is invalid"
- Vérifiez que `SLACK_WEBHOOK` est une URL valide
- Testez le webhook manuellement

### Logs de Débogage
```bash
# Activer les logs détaillés dans le workflow
- name: Debug secrets
  run: |
    echo "Checking secrets availability..."
    if [ -n "${{ secrets.DOCKER_USERNAME }}" ]; then
      echo "DOCKER_USERNAME is set"
    else
      echo "DOCKER_USERNAME is not set"
    fi
```

## 📞 Support

Si vous rencontrez des problèmes avec la configuration des secrets :

1. Vérifiez la documentation officielle GitHub Actions
2. Consultez les logs d'erreur dans l'onglet Actions
3. Testez chaque secret individuellement
4. Contactez l'équipe de développement

---

**Note** : Ne partagez jamais les valeurs des secrets dans le code ou la documentation publique !


