<div align="center">

<img src="docs/banniere.png" alt="Bot Support, bot Discord du serveur MicroCoaster" width="100%">

</div>

MicroCoaster vend des montagnes russes miniatures imprimées en 3D. Chaque produit est livré avec un code de garantie, et tout le service après-vente se passe sur Discord. Ce bot fait le lien : il vérifie les codes, ouvre les tickets, route vers la bonne équipe et garde la trace de tout.

<img src="docs/sections/s01.png" alt="01 Ce qu'il fait" width="100%">

**Les garanties, en deux temps.** Le client active son code lui-même, mais la garantie ne démarre qu'après validation humaine. Ce délai laisse le temps de vérifier une commande douteuse avant d'engager douze mois de couverture.

<img src="docs/schemas/garantie.png" alt="Le client active : il saisit son code de garantie, le code est vérifié, l'activation passe en attente. Un admin valide : la garantie ne démarre qu'après ce contrôle humain, le temps de vérifier une commande douteuse. Le bot suit : rôle attribué, échéance posée, rappels automatiques à trente jours puis sept jours de l'échéance." width="100%">

Le rôle de garantie survit aux départs du serveur : à chaque arrivée, le bot consulte `user_roles_backup` et restaure ce qui était dû. Un contrôle d'intégrité passe aussi au démarrage, pour rattraper les rôles perdus pendant une coupure.

**La billetterie, en quatre catégories.** Technique, produit, commercial, recrutement, chacune notifiant son équipe. Chaque ticket reçoit un numéro incrémental, un salon dédié, une priorité modifiable, et une transcription archivée à la fermeture.

<img src="docs/sections/s02.png" alt="02 Commandes" width="100%">

<img src="docs/schemas/commandes.png" alt="Administration des garanties : /add-code ajoute un code premium, /activate-warranty valide une activation en attente et ouvre la garantie, /list-pending-warranties liste les activations à traiter, /warranty-extend prolonge une garantie existante, /setup-warranty publie le panneau d'activation. Support : /send-tickets publie le panneau d'ouverture de ticket. Modération : /ban et /unban pour le bannissement et sa levée, /mute pour la réduction au silence temporaire, /warn pour un avertissement tracé. Administration : /setup-bot crée rôles, salons et catégories, /config et /config-view pour la configuration par menus, /force-restore-roles force la restauration des rôles de garantie." width="100%">

<img src="docs/sections/s03.png" alt="03 Données" width="100%">

```
commands/    Commandes slash, une par fichier
buttons/     Gestionnaires d'interaction des boutons
modals/      Formulaires modaux
events/      Cycle de vie Discord : ready, arrivées, départs, messages
dao/         Accès base : garanties, tickets, modération
config/      IDs de rôles, salons et catégories du serveur
```

<img src="docs/schemas/donnees.png" alt="warranty_premium_codes : codes de garantie, état d'activation et échéance. warranty_activation_logs : journal des activations, pour retrouver qui a validé quoi. support_tickets et ticket_counter : tickets ouverts et numérotation incrémentale. ticket_transcriptions : archives de conversation écrites à la fermeture du ticket. user_status et user_bans : état et sanctions par membre. user_roles_backup et role_restoration_logs : rôles sauvegardés et restaurations effectuées. moderation_logs : piste d'audit de toutes les actions de modération. Les tables sont créées par le bot au premier démarrage." width="100%">

<img src="docs/sections/s04.png" alt="04 Installation" width="100%">

```bash
git clone https://github.com/Microcoaster/Microcoaster-bot.git
cd Microcoaster-bot
npm install
cp .env.example .env
```

**Base de données.** MySQL 8.0 ou supérieur. Créez la base et l'utilisateur, puis laissez le bot créer ses tables au premier démarrage.

```sql
CREATE DATABASE microcoaster_bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'bot_user'@'localhost' IDENTIFIED BY 'un_mot_de_passe_solide';
GRANT ALL PRIVILEGES ON microcoaster_bot.* TO 'bot_user'@'localhost';
FLUSH PRIVILEGES;
```

**Variables d'environnement.**

<img src="docs/schemas/environnement.png" alt="DISCORD_TOKEN : token du bot délivré par le portail développeur Discord. CLIENT_ID : identifiant de l'application Discord. DB_NAME : nom de la base MySQL. DB_HOST et DB_PORT : adresse du serveur MySQL. DB_USER et DB_PASSWORD : identifiants de connexion à la base. Aucune de ces valeurs ne doit rejoindre le dépôt, elles vivent dans le fichier .env." width="100%">

**Mise en route.**

```bash
npm start          # le bot démarre et enregistre ses commandes
```

Puis sur le serveur Discord :

```
/setup-bot         # crée rôles, catégories et salons
/config            # renseigne les IDs dans config/config.json
/setup-warranty    # publie le panneau d'activation
/send-tickets      # publie le panneau de support
```

<img src="docs/sections/s05.png" alt="05 Contribuer" width="100%">

Trois choses à savoir avant de toucher au dépôt.

- `config/config.json` contient des identifiants de serveur Discord, propres à une installation. Reconfigurez avec `/config` plutôt que de les reprendre tels quels.
- Les commandes sont enregistrées globalement au démarrage. Discord peut mettre jusqu'à une heure à les propager.
- Les tâches planifiées, rappels et nettoyage quotidien, suivent le fuseau horaire de la machine hôte.

L'architecture modulaire s'appuie sur un template Discord.js sous licence MIT. La logique métier, garanties, billetterie et restauration de rôles, est spécifique à MicroCoaster.

Le cycle de contribution est celui de l'organisation : une issue décrit le travail, une branche part de `develop`, une pull request revient dessus et passe en review.

---

<sub>MicroCoaster · Auteurs : Cybertrist, Yamakajump</sub>
