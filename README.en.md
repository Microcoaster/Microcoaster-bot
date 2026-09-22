<div align="center">

<p>
  <a href="README.md"><img src="docs/langues/fr-off.png" alt="Lire cette page en français" width="150" /></a>
  <img src="docs/langues/en-on.png" alt="English, page shown" width="150" />
</p>

<img src="docs/en/banniere.png" alt="Support Bot, the Discord bot of the MicroCoaster server" width="100%">

</div>

MicroCoaster sells 3D-printed miniature roller coasters. Every product ships with a warranty code, and all after-sales support happens on Discord. This bot is the link: it checks the codes, opens the tickets, routes them to the right team and keeps a record of everything.

<img src="docs/en/sections/s01.png" alt="01 What it does" width="100%">

**Warranties, in two steps.** The customer activates their code themselves, but the warranty only starts after a human approval. That pause leaves time to look at a doubtful order before committing to twelve months of cover.

<img src="docs/en/schemas/garantie.png" alt="The customer activates: they enter their warranty code, the code is checked, the activation goes into the queue. An admin approves: the warranty only starts after that human check, long enough to look at a doubtful order. The bot follows through: role granted, expiry set, automatic reminders at thirty days then seven days before expiry." width="100%">

The warranty role survives leaving the server: on every arrival, the bot checks `user_roles_backup` and restores what was owed. An integrity check also runs at startup, to catch up on roles lost during an outage.

**Ticketing, in four categories.** Technical, product, sales, recruitment, each notifying its own team. Every ticket gets an incrementing number, a dedicated channel, an adjustable priority, and a transcript archived on close.

<img src="docs/en/sections/s02.png" alt="02 Commands" width="100%">

<img src="docs/en/schemas/commandes.png" alt="Warranty administration: /add-code adds a premium code, /activate-warranty approves a queued activation and opens the warranty, /list-pending-warranties lists the activations still to handle, /warranty-extend extends an existing warranty, /setup-warranty posts the activation panel. Support: /send-tickets posts the ticket-opening panel. Moderation: /ban and /unban for banning and lifting, /mute for temporary silencing, /warn for a recorded warning. Administration: /setup-bot creates roles, channels and categories, /config and /config-view for configuration through menus, /force-restore-roles forces the restoration of warranty roles." width="100%">

<img src="docs/en/sections/s03.png" alt="03 Data" width="100%">

<img src="docs/en/schemas/arborescence.png" alt="Repository tree. commands: the slash commands, one per file. buttons: the button interaction handlers. modals: the modal input forms. events: the Discord lifecycle, startup, arrivals, departures, messages. dao: database access, one class per domain, with warrantyDAO for codes activations and expiries, ticketDAO for tickets numbering and transcripts, moderationDAO for sanctions and the audit trail. utils: the base layer, database initialisation, configuration handling, ban expiry. sql: init_tables.sql applied on first boot. config: config.json, the IDs of roles, channels and categories." width="100%">

<img src="docs/en/schemas/donnees.png" alt="warranty_premium_codes: warranty codes, activation state and expiry. warranty_activation_logs: the activation log, to trace who approved what. support_tickets and ticket_counter: open tickets and the incrementing numbering. ticket_transcriptions: conversation archives written when the ticket closes. user_status and user_bans: state and sanctions per member. user_roles_backup and role_restoration_logs: saved roles and the restorations carried out. moderation_logs: the audit trail of every moderation action. The tables are created by the bot on first boot." width="100%">

<img src="docs/en/sections/s04.png" alt="04 Installation" width="100%">

```bash
git clone https://github.com/Microcoaster/Microcoaster-bot.git
cd Microcoaster-bot
npm install
cp .env.example .env
```

**Database.** MySQL 8.0 or above. Create the database and the user, then let the bot create its tables on first boot.

```sql
CREATE DATABASE microcoaster_bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'bot_user'@'localhost' IDENTIFIED BY 'un_mot_de_passe_solide';
GRANT ALL PRIVILEGES ON microcoaster_bot.* TO 'bot_user'@'localhost';
FLUSH PRIVILEGES;
```

**Environment variables.**

<img src="docs/en/schemas/environnement.png" alt="DISCORD_TOKEN: the bot token issued by the Discord developer portal. CLIENT_ID: the Discord application ID. DB_NAME: the name of the MySQL database. DB_HOST and DB_PORT: the address of the MySQL server. DB_USER and DB_PASSWORD: the database connection credentials. None of these values should ever reach the repository, they live in the .env file." width="100%">

**Getting it running.**

```bash
npm start          # the bot starts and registers its commands
```

Then on the Discord server, in this order.

<img src="docs/en/schemas/mise-en-route.png" alt="Step 1, /setup-bot: creates the roles, categories and channels the bot needs, run it first and only once. Step 2, /config: fills the IDs it just created into config/config.json, through interactive menus. Step 3, /setup-warranty: posts the warranty activation panel in the channel meant for it. Step 4, /send-tickets: posts the ticket-opening panel, the bot is live." width="100%">

<img src="docs/en/sections/s05.png" alt="05 Contributing" width="100%">

Three things to know before touching the repository.

- `config/config.json` holds Discord server IDs, specific to one installation. Reconfigure with `/config` rather than reusing them as they are.
- The commands are registered globally at startup. Discord can take up to an hour to propagate them.
- The scheduled jobs, reminders and the daily cleanup, follow the host machine's timezone.

The modular architecture builds on a Discord.js template under the MIT licence. The business logic, warranties, ticketing and role restoration, is specific to MicroCoaster.

The contribution cycle is the organisation's: an issue describes the work, a branch starts from `develop`, a pull request comes back onto it and goes through review.

---

<sub>MicroCoaster · Authors: Cybertrist, Yamakajump</sub>
