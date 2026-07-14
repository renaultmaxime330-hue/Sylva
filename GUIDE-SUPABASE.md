# ☁️ Synchronisation cloud (Supabase) — étapes pour toi

La synchro cloud sauvegarde tes données en ligne et les synchronise entre tes appareils
(téléphone, tablette, ordinateur). Elle utilise **Supabase**, gratuit pour cet usage.

Tu fais juste les 3 étapes ci-dessous (~3 min), puis tu me donnes 2 informations et **je
construis le reste** (schéma de la base + moteur de synchronisation, que je testerai avec ton projet).

## 1. Crée un compte

- Va sur **https://supabase.com** → **Start your project** → connecte-toi (e-mail ou GitHub).

## 2. Crée un projet

- Clique **New project**.
- Donne-lui un nom (ex. `sylva`), choisis une région proche (ex. *Europe West / Paris*).
- Choisis un mot de passe de base de données (note-le quelque part).
- Clique **Create new project** et attends ~1 min qu'il soit prêt.

## 3. Récupère les 2 informations à me donner

Dans ton projet Supabase :

- Menu **Project Settings** (roue crantée) → **API**.
- Copie :
  1. **Project URL** (ex. `https://abcdxyz.supabase.co`)
  2. **anon public** key (une longue clé qui commence par `eyJ...`)

## 4. Envoie-les moi

Colle-moi ces 2 valeurs (Project URL + clé anon). Elles sont **publiques** et faites pour être
dans une app côté client — pas de risque.

Ensuite je :
- crée les tables et les règles de sécurité dans ton Supabase,
- ajoute la connexion dans la page **Réglages**,
- construis la **synchronisation automatique** (tes données locales montent dans le cloud dès
  qu'il y a du réseau, et se retrouvent sur tous tes appareils),
- et je teste tout avec ton projet avant de te dire que c'est bon.

> 🔒 Tes données restent privées : chaque compte ne voit que ses propres données (règles de
> sécurité au niveau de la base).
