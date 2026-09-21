<div align="center">

<img src="docs/banniere.png" alt="Bot Support, bot Discord du serveur MicroCoaster" width="100%">

</div>

MicroCoaster vend des montagnes russes miniatures imprimées en 3D. Chaque produit est livré avec un code de garantie, et tout le service après-vente se passe sur Discord. Ce bot fait le lien : il vérifie les codes, ouvre les tickets, route vers la bonne équipe et garde la trace de tout.

<img src="docs/sections/s01.png" alt="01 Ce qu'il fait" width="100%">

**Les garanties, en deux temps.** Le client active son code lui-même, mais la garantie ne démarre qu'après validation humaine. Ce délai laisse le temps de vérifier une commande douteuse avant d'engager douze mois de couverture.

```
Client : /activate            code validé, activation en attente
Admin  : /activate-warranty   garantie ouverte, rôle attribué, échéance posée
Bot    : rappels automatiques à J-30 et J-7
```

Le rôle de garantie survit aux départs du serveur : à chaque arrivée, le bot consulte `user_roles_backup` et restaure ce qui était dû. Un contrôle d'intégrité passe aussi au démarrage, pour rattraper les rôles perdus pendant une coupure.

**La billetterie, en quatre catégories.** Technique, produit, commercial, recrutement, chacune notifiant son équipe. Chaque ticket reçoit un numéro incrémental, un salon dédié, une priorité modifiable, et une transcription archivée à la fermeture.

<img src="docs/sections/s02.png" alt="02 Commandes" width="100%">

**Garanties**

| Commande | Accès | Rôle |
|:--|:--|:--|
| `/add-code` | Admin | Ajoute un code premium au système |
| `/activate-warranty` | Admin | Valide une activation en attente |
| `/list-pending-warranties` | Admin | Liste les activations à traiter |
| `/warranty-extend` | Admin | Prolonge une garantie existante |
| `/setup-warranty` | Admin | Publie le panneau d'activation |

**Support**

| Commande | Accès | Rôle |
|:--|:--|:--|
| `/send-tickets` | Admin | Publie le panneau d'ouverture de ticket |

**Modération**

| Commande | Accès | Rôle |
|:--|:--|:--|
| `/ban` · `/unban` | Modérateur | Bannissement et levée |
| `/mute` | Modérateur | Réduction au silence temporaire |
| `/warn` | Modérateur | Avertissement manuel tracé |

**Administration**

| Commande | Accès | Rôle |
|:--|:--|:--|
| `/setup-bot` | Admin | Crée rôles, salons et catégories en une fois |
| `/config` · `/config-view` | Admin | Configuration par menus interactifs |
| `/assign-member-role` | Admin | Attribue le rôle membre à tout le serveur |
| `/force-restore-roles` | Admin | Force la restauration des rôles de garantie |

<img src="docs/sections/s03.png" alt="03 Données" width="100%">

```
commands/    Commandes slash, une par fichier
buttons/     Gestionnaires d'interaction des boutons
modals/      Formulaires modaux
events/      Cycle de vie Discord : ready, arrivées, départs, messages
dao/         Accès base : garanties, tickets, modération
config/      IDs de rôles, salons et catégories du serveur
```

| Table | Contenu |
|:--|:--|
| `warranty_premium_codes` | Codes, état d'activation, échéance |
| `warranty_activation_logs` | Journal des activations |
| `support_tickets` · `ticket_counter` | Tickets et numérotation |
| `ticket_transcriptions` | Archives de conversation |
| `user_status` · `user_bans` | État et sanctions par membre |
| `user_roles_backup` · `role_restoration_logs` | Rôles sauvegardés et restaurations |
| `moderation_logs` | Piste d'audit des actions de modération |

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

| Variable | Rôle |
|:--|:--|
| `DISCORD_TOKEN` | Token du bot |
| `CLIENT_ID` | ID de l'application Discord |
| `DB_HOST` · `DB_PORT` | Serveur MySQL |
| `DB_USER` · `DB_PASSWORD` | Identifiants MySQL |
| `DB_NAME` | Nom de la base |

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
