# Yazio — Projet de formation Studio IA

Cette application est un projet pédagogique développé dans le cadre de la formation **Studio IA** :
👉 https://formation.drissas.com/studio-ia

Elle sert de cas pratique pour illustrer, de bout en bout, la construction d'une app mobile moderne (React Native / Expo) assistée par l'IA : suivi nutritionnel, authentification, analyse de repas par photo (IA), et abonnements premium (RevenueCat), le tout backé par Supabase.

## Stack technique

- [Expo](https://expo.dev) (React Native) avec [file-based routing](https://docs.expo.dev/router/introduction)
- [Supabase](https://supabase.com) — auth, base de données, Edge Functions
- [RevenueCat](https://www.revenuecat.com) — gestion des abonnements premium

## Démarrer le projet

1. Installer les dépendances

   ```bash
   npm install
   ```

2. Copier le fichier d'environnement et renseigner tes propres clés

   ```bash
   cp .env.example .env
   ```

3. Lancer l'app

   ```bash
   npx expo start
   ```

Dans la sortie de la commande, tu trouveras des options pour ouvrir l'app dans :

- un [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- un émulateur [Android](https://docs.expo.dev/workflow/android-studio-emulator/)
- un simulateur [iOS](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), un bac à sable limité pour essayer rapidement l'app

Le code de l'application se trouve dans le dossier **src/app**.

## Pour aller plus loin

Ce dépôt est utilisé comme support de cours dans la formation **Studio IA** de Driss AS, où sont abordés :

- la conception d'une app mobile avec l'aide d'un agent IA (Claude Code)
- l'intégration d'un backend Supabase (auth, base de données, Edge Functions)
- l'ajout de fonctionnalités IA (analyse d'image de repas)
- la mise en place d'abonnements payants avec RevenueCat

Plus d'informations et inscription à la formation : https://formation.drissas.com/studio-ia

## Ressources Expo

- [Documentation Expo](https://docs.expo.dev/)
- [Tutoriel Expo](https://docs.expo.dev/tutorial/introduction/)
