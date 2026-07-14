# 📱 Mettre Sylva en ligne (pour l'utiliser sur ton téléphone, hors-ligne)

Aujourd'hui l'app tourne sur ton PC. Pour l'installer sur ton **téléphone** et l'utiliser
**en forêt sans réseau**, il faut la mettre en ligne une fois. C'est **gratuit** et ça se fait en ~5 minutes.

## Option la plus simple : Vercel (recommandé)

Vercel héberge gratuitement les apps Next.js.

### 1. Crée un compte Vercel

- Va sur **https://vercel.com** → **Sign Up** → connecte-toi (avec ton e-mail ou un compte GitHub/Google).

### 2. Déploie depuis ton PC

Ouvre un terminal **dans le dossier `sylva`** (clic droit dans le dossier → « Ouvrir dans le terminal »)
et tape :

```
npx vercel
```

- La 1re fois, il te demande de te connecter (`Log in`) → suis le lien affiché.
- Puis il pose quelques questions → **appuie sur Entrée** à chaque fois (les valeurs par défaut conviennent) :
  - *Set up and deploy?* → **Entrée** (Yes)
  - *Which scope?* → **Entrée**
  - *Link to existing project?* → **N** puis Entrée
  - *Project name?* → **Entrée** (sylva)
  - *Directory?* → **Entrée** (`./`)
  - *Override settings?* → **Entrée** (No)

À la fin, il affiche une **adresse** du type `https://sylva-xxx.vercel.app`.

### 3. Passe en production

```
npx vercel --prod
```

Tu obtiens l'adresse **définitive** de ton app.

### 4. Installe-la sur ton téléphone

- Ouvre l'adresse dans le navigateur de ton téléphone.
- **iPhone (Safari)** : bouton Partager → **« Sur l'écran d'accueil »**.
- **Android (Chrome)** : menu ⋮ → **« Installer l'application »** / **« Ajouter à l'écran d'accueil »**.

L'icône Sylva apparaît sur ton écran d'accueil. À la 1re ouverture avec réseau, l'app se met en cache :
ensuite elle fonctionne **hors-ligne** (tes données sont déjà locales).

> ⚠️ Pour l'instant, les **fonds de carte** ne sont pas encore mis en cache hors-ligne (améliration à venir).
> Tout le reste (chantiers, tracés, production, engins) fonctionne sans réseau.

## Mettre à jour l'app plus tard

Après une modification, refais simplement :

```
npx vercel --prod
```

## Alternative : GitHub + Vercel (mises à jour automatiques)

Si tu crées un dépôt GitHub et y pousses le projet, Vercel peut le déployer
**automatiquement à chaque modification**. Demande-moi de t'aider si tu veux cette option.
