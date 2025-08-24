# 📧 Email Templates Architecture

Cette architecture professionnelle sépare les templates du code métier pour une meilleure maintenabilité.

## 🏗️ Structure

```
src/
├── templates/
│   ├── welcome/
│   │   ├── welcome.html.hbs    # Template HTML Handlebars
│   │   └── welcome.text.hbs    # Template texte Handlebars
│   └── subscription/
│       ├── subscription.html.hbs
│       └── subscription.text.hbs
├── utils/
│   └── template.service.ts     # Service de gestion des templates
└── services/
    └── email.service.ts        # Service d'envoi d'emails (nettoyé)
```

## ⚡ Avantages

1. **Séparation des responsabilités** : Templates séparés du code métier
2. **Cache intelligent** : Templates compilés mis en cache pour les performances
3. **Maintenance facile** : Modification des templates sans toucher au code
4. **Extensibilité** : Ajout de nouveaux templates simplifié
5. **Type Safety** : Interfaces TypeScript pour les données des templates

## 🔧 Utilisation

### Ajouter un nouveau template

1. **Créer le dossier** : `src/templates/mon-template/`
2. **Créer les fichiers** :
   - `mon-template.html.hbs` (version HTML)
   - `mon-template.text.hbs` (version texte)
3. **Ajouter l'interface** dans `template.service.ts`
4. **Ajouter la méthode** dans `TemplateService`
5. **Utiliser** dans `EmailService`

### Exemple d'utilisation

```typescript
// Dans EmailService
const template = await this.templateService.getWelcomeEmailTemplate(userData);

const mailOptions = {
  subject: template.subject,
  html: template.html,
  text: template.text,
  // ...
};
```

## 🎨 Syntaxe Handlebars

Les templates utilisent [Handlebars](https://handlebarsjs.com/) :

```handlebars
{{!-- Variables simples --}}
<h1>Bonjour {{firstName}} !</h1>

{{!-- Conditions --}}
{{#if isTrialActive}}
  <p>Période d'essai active</p>
{{else}}
  <p>Abonnement payant</p>
{{/if}}

{{!-- Formatage --}}
<p>Date: {{formatDate createdAt}}</p>
```

## 🚀 Performance

- **Cache** : Templates compilés mis en cache automatiquement
- **Lazy Loading** : Templates chargés uniquement quand nécessaire
- **Memory Management** : Cache peut être vidé si nécessaire

## 🔍 Debug

```typescript
// Vérifier le statut du cache
const status = templateService.getCacheStatus();
console.log("Templates en cache:", status.keys);

// Vider le cache (dev uniquement)
templateService.clearCache();
```

## 📝 Variables disponibles

### Welcome Email

- `firstName`, `lastName`, `fullName`
- `provider` (Google, Facebook, etc.)
- `email`, `baseUrl`, `year`

### Subscription Email

- `firstName`, `lastName`, `fullName`
- `plan`, `planType`, `status`
- `isTrialActive`, `trialEnd`, `nextBillingDate`
- `amount`, `currency`, `baseUrl`, `year`
