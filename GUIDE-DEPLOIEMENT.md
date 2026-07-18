# Mettre Sylva en ligne sur Railway

Sylva tourne désormais sur un **backend hébergé** (Postgres + un serveur Node
avec Socket.io) — ce n'est plus une PWA locale qu'on déploie sur Vercel.
Le déploiement se fait sur **Railway**, là où le Postgres a déjà été créé.

⚠️ Vercel ne convient plus : Sylva utilise un **serveur Node custom**
(`server.ts`, pour porter Socket.io à côté de Next.js), incompatible avec
l'hébergement « serverless » de Vercel. Railway héberge un vrai process
Node qui tourne en continu — c'est ce qu'il faut ici.

## Ce qui existe déjà

- Un **projet Railway** avec un service **PostgreSQL** (celui utilisé pour le
  développement — `DATABASE_URL` dans `sylva/.env.local`).
- Le code de Sylva, dans un dépôt Git relié à
  **https://github.com/renaultmaxime330-hue/Sylva**.

## Étape 1 — Créer le service applicatif sur Railway

Dans le projet Railway existant (celui qui contient déjà le Postgres) :

1. **+ New** → **GitHub Repo** → sélectionner `renaultmaxime330-hue/Sylva`
   (autoriser Railway à accéder au dépôt GitHub si demandé).
2. Railway détecte un projet Node (via `package.json`) et propose un build
   automatique — pas de config supplémentaire nécessaire : il exécutera
   `npm run build` puis `npm run start` (scripts déjà définis dans
   `package.json`).
3. Une fois le service créé, ouvrir son onglet **Settings** :
   - **Healthcheck Path** : `/api/health` (le service répond
     `{"db":"ok"}` si la base est joignable — Railway l'utilise pour savoir
     si le déploiement est réellement utilisable, pas juste démarré, et
     annule automatiquement un déploiement cassé).
   - **Root Directory** : laisser vide si le dépôt GitHub ne contient QUE
     Sylva à la racine (c'est le cas ici).

## Étape 2 — Variables d'environnement

Onglet **Variables** du service applicatif (PAS celui du Postgres) :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` — référence la variable interne du service Postgres du même projet (Railway la résout automatiquement). ⚠️ Utiliser la variable **interne** ici, pas `DATABASE_PUBLIC_URL` : les deux services tournent dans le même réseau privé Railway, c'est plus rapide et ça ne compte pas dans le quota de bande passante. |
| `JWT_ACCESS_SECRET` | Une chaîne aléatoire longue, **différente** de celle utilisée en dev. Générer avec `openssl rand -base64 48`. |
| `JWT_REFRESH_SECRET` | Idem, une **autre** chaîne différente de la précédente. |
| `NODE_ENV` | `production` |

Ne PAS définir `PORT` manuellement — Railway l'injecte automatiquement et
`server.ts` le lit déjà (`process.env.PORT`).

⚠️ Utiliser des secrets JWT **différents** de ceux de `.env.local` : les
jetons émis par le serveur de dev ne doivent pas être valides sur la prod
(et inversement). Après le premier déploiement, tout le monde devra se
reconnecter une fois (c'est normal, pas un bug).

## Étape 3 — Déployer

Railway déploie automatiquement à chaque `git push` sur la branche `main`
(déploiement continu, activé par défaut sur un service relié à GitHub).

Pour le tout premier déploiement, il suffit donc de pousser le code sur
`origin/main` (voir la note ci-dessous — il y a actuellement plusieurs
mois de travail non commité à intégrer d'abord). Railway démarre le build
automatiquement dès que GitHub reçoit le push ; suivre la progression dans
l'onglet **Deployments** du service.

## Étape 4 — Vérifier avant de considérer que c'est « en prod »

Une fois le déploiement marqué **Active** :

1. Ouvrir l'URL fournie par Railway (`Settings` → **Networking** → **Generate
   Domain** si aucune URL publique n'existe encore — un sous-domaine gratuit
   `*.up.railway.app` suffit, un nom de domaine perso peut être ajouté plus
   tard).
2. `https://<url>/api/health` doit répondre `{"db":"ok"}`.
3. Dérouler le parcours complet **sur cette URL hébergée** (pas en local) :
   inscription, création d'équipe, un second compte qui la rejoint par
   code, création d'un chantier avec parcelle dessinée, journée de
   production, alerte d'entretien, facture numérotée — et vérifier que les
   deux comptes se voient en temps réel (position + notification de carte).
   C'est ce passage qui fait office de « staging » : le code est le même
   qu'en dev, mais tourner pour de vrai sur l'infra hébergée (réseau,
   variables d'environnement, cookies `Secure` sur HTTPS…) peut révéler des
   problèmes invisibles en local.
4. Si tout est bon : c'est en production. Étant donné l'échelle du projet
   (une équipe de 2), il n'y a pas de second Postgres de staging à
   maintenir en parallèle — cohérent avec le reste des choix
   proportionnés du projet (voir le plan de migration).

## Installer l'app sur le téléphone

Une fois l'URL hébergée disponible :

- **iPhone (Safari)** : ouvrir l'URL → bouton Partager → **« Sur l'écran
  d'accueil »**.
- **Android (Chrome)** : ouvrir l'URL → menu ⋮ → **« Installer
  l'application »**.

⚠️ Contrairement à l'ancienne version, Sylva **nécessite désormais une
connexion réseau** pour fonctionner (voir le pivot d'architecture) — plus
d'usage hors-ligne en forêt sans couverture.

## Mettre à jour l'app plus tard

Chaque `git push` sur `main` redéploie automatiquement. Rien d'autre à faire.

## Domaine personnalisé (optionnel)

Dans **Settings** → **Networking** → **Custom Domain**, suivre les
instructions Railway (ajouter un enregistrement CNAME chez le
registrar du domaine).
