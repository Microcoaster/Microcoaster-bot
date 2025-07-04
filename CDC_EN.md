# 📋 **Requirements Document - MicroCoaster™ Discord Bot**

---

## 📖 **Table of Contents**

1. [Project Overview](#-project-overview)
2. [Objectives](#-objectives)
3. [Technical Architecture](#️-technical-architecture)
4. [Detailed Features](#️-detailed-features)
5. [Database](#-database)
6. [Configuration and Permissions](#-configuration-and-permissions)
7. [Technical Notes](#-technical-notes)

---

## 🧮 **Project Overview**

**MicroCoaster™** is a Discord bot developed to manage and automate services for a 3D printed microcoaster selling business. The bot facilitates product warranty activation with premium status, customer support, and Discord server moderation.

### **Context**
- **Company** : MicroCoaster™ (3D printed microcoaster sales)
- **Platform** : Discord
- **Technologies** : Node.js, Discord.js v14, MYSQL
- **Target Audience** : Company customers, staff, moderators
- **⚠️ Important Language Note** : Source code is in French, but **all user interfaces (buttons, messages, embeds) must be in English** as the target Discord server serves an English-speaking audience

---

## 🎯 **Objectives**

### **Primary Objectives**
- Automate warranty activation with premium status
- Provide an efficient customer support system
- Maintain a healthy and moderated Discord environment
- Simplify administrative workload for staff

### **Secondary Objectives**
- Improve customer experience
- Reduce manual staff workload
- Create a comprehensive logging system for tracking
- Enable future system scalability

---

## 🏗️ **Technical Architecture**

### **Technologies Used**
- **Runtime** : Node.js (version 18+)
- **Discord Framework** : Discord.js v14
- **Database** : MYSQL
- **Authentication** : Discord Bot Tokens
- **Hosting** : Personal hosting

### **Project Structure**
```
Microcoaster-bot/
├── index.js              # Main entry point
├── config/
│   └── config.json       # Bot configuration
├── commands/             # Bot slash commands
├── buttons/              # Button handlers
├── modals/               # Modal handlers
├── events/               # Discord events
├── dao/                  # Data Access Objects
├── utils/                # Utilities and helpers
└── sql/                  # Database scripts
```

---

## ⚙️ **Detailed Features**

### 📦 **Code Activation and Warranty Management Module**

**Channel** : `#📦・warranty-activation`

#### **Objective**
Allow customers to activate their premium codes and administrators to manage product warranty activation.

#### **Technical Specifications**
- **Setup command** : `/setup-warranty` (admin only)
- **Warranty command** : `/activate-warranty <user>` (admin only)
- **User interface** : Embed with interaction button
- **Modal** : Code input field
- **Reminder system** : Scheduled tasks (cron jobs)
- **Auto re-assignment** : Role persistence system

#### **Detailed Operation**

##### **Step 1: Code Activation by User**

1. **Initial Display**
   - Embed with title: "📦 Premium Code Activation"
   - Explanatory description of the process (in English)
   - Button: `📋 Activate my code`

2. **User Activation Process**
   - Button click → Discord modal opens
   - Required field:
     - Premium/warranty code (unique identifier) - Label in English
   - Automatic server-side validation:
     - Code exists in database
     - Code not already used

3. **Possible Results**
   - **Success**:
     - Automatic assignment of `🎖️ Premium` role
     - Code linking to user in database
     - Confirmation message with code status (in English)
     - **IMPORTANT**: If warranty already activated by admin → Also assign `🛡️ Garantie Active` role
     - Action logging
   - **Failure**:
     - Specific error message (in English)
     - Attempt limitation (3 max per user/hour)
     - Guidance to support if needed (in English)

##### **Step 2: Warranty Activation by Admin**

1. **Admin Command** : `/activate-warranty <user>`
   - Verify user has linked code
   - Activate warranty in database
   - Assign `🛡️ Garantie Active` role to user
   - Start warranty countdown (1 year)
   - Schedule automatic reminders

2. **Results**
   - **Success**:
     - User receives `🛡️ Garantie Active` role
     - Confirmation message to user and admin (in English)
     - Record warranty activation date
     - Schedule automatic reminders
   - **Failure**:
     - Error message if user has no linked code (in English)
     - Error message if warranty already active (in English)

#### **Automatic Reminder System**
- **11 months after warranty activation** : First reminder (DM in English)
- **1 week before expiration** : Final reminder (DM + optional ping in English)
- **Expiration** : Automatic removal of `🛡️ Garantie Active` role (Premium remains)

#### **Automatic Role Re-assignment System**
- **Trigger event** : `guildMemberAdd` (user rejoins server)
- **Verification** : Database check
  - If code linked → re-assign `🎖️ Premium` role
  - If warranty active → also re-assign `🛡️ Garantie Active` role
- **Notification** : Personalized welcome message mentioning role restoration (in English)
- **Log** : Record automatic re-assignment

#### **Staff Features**
- Command `/activate-warranty <user>` : Activate warranty for a user
- Command `/warranty-check <user>` : Check complete status (code + warranty)
- Command `/warranty-extend <user> <days>` : Extend warranty
- Command `/force-restore-roles <user>` : Manually re-assign roles
- Command `/list-pending-warranties` : View linked codes without activated warranty
- Dashboard of linked codes and active warranties

#### **Security**
- Rate limiting : 3 attempts/hour/user
- Single-use codes
- Complete action logging
- Validity verification during re-assignments
- Permission separation : users can link, only admins activate warranties

---

### ❓ **Ticket Support System**

**Channel** : `#❓・support`

#### **Objective**
Provide a structured and efficient customer support system with automated ticket management.

#### **Technical Specifications**
- **Command** : `/setup-support` (admin only)
- **Dynamic categories** : Automatic private channel creation
- **Permissions** : Automatic access management
- **Archiving** : Optional conversation backup

#### **Available Ticket Types**

1. **🛠️ Microcoaster Problem**
   - Private channel with customer and technical team
   - Automatic question templates (in English)
   - Image upload capability

2. **🎮 Discord Problem**
   - Support for server-related issues
   - Moderation team automatically notified
   - Automatic FAQ (in English)

3. **📨 Staff Application**
   - Structured application process
   - Automatic form via modal (in English)
   - HR manager notification

#### **Detailed Operation**

1. **Ticket Creation**
   - Button click → Immediate private channel creation
   - Format: `ticket-[type]-[username]-[timestamp]`
   - Automatic permissions: customer + relevant staff
   - Personalized welcome message according to type

2. **Ticket Management**
   - Automatic guidance messages (in English)
   - Staff action buttons:
     - `📌 Mark as Priority`
     - `👤 Assign to Member`
     - `📋 Add Internal Notes`
     - `🔒 Close Ticket`

3. **Ticket Closure**
   - Mandatory confirmation
   - Optional backup to `.txt` file
   - Customer satisfaction message (in English)
   - Channel deletion after 24h

#### **Advanced Features**
- **Auto-assignment** : Based on staff workload
- **Automatic escalation** : If no response within 24h
- **Statistics** : Average response time, customer satisfaction
- **Templates** : Predefined responses for common cases

---

### 🛡️ **Automated Moderation System**

#### **Objective**
Maintain a healthy, respectful, and secure Discord environment.

#### **Technical Specifications**
- **Real-time filter** : Analysis of all messages
- **Database** : Blacklist of forbidden words/expressions
- **Point system** : Sanction accumulation
- **Centralized logs** : Channel `#📁・logs-moderation`

#### **Sanction Levels**

##### **Level 1 - Warning (1-2 points)**
- **Triggers** : Slightly inappropriate language, minor spam
- **Actions** :
  - Automatic message deletion
  - Private message warning (in English)
  - Log in moderation channel

##### **Level 2 - Temporary Sanctions (3-5 points)**
- **Triggers** : Recurrence, more offensive language
- **Actions** :
  - Temporary mute (10-30 minutes based on points)
  - Message deletion
  - Moderator notification

##### **Level 3 - Heavy Sanctions (6+ points)**
- **Triggers** : Harassment, hate speech, illegal content
- **Actions** :
  - Immediate kick or ban
  - Message history deletion
  - Priority alert to administrators

#### **Advanced Features**
- **Whitelist** : Exceptions for certain roles/users
- **Intelligent context** : Context analysis to avoid false positives
- **Appeals system** : Ability to contest a sanction
- **Statistics** : Moderation action dashboard

#### **Moderation Commands**
- `/warn <user> <reason>` : Manual warning
- `/mute <user> <duration> <reason>` : Temporary mute
- `/ban <user> <reason>` : Permanent ban
- `/unban <user>` : Lift a ban
- `/modlogs <user>` : Sanction history
- `/appeal <case_id>` : Contest a sanction

---

## 💾 **Database**

### **Table Structure**

#### **Table `warranty_premium_codes`**
```sql
CREATE TABLE warranty_premium_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    user_id VARCHAR(20) NULL,
    is_used BOOLEAN DEFAULT FALSE,
    linked_at TIMESTAMP NULL,
    warranty_activated BOOLEAN DEFAULT FALSE,
    warranty_activated_by VARCHAR(20) NULL,
    warranty_activated_at TIMESTAMP NULL,
    warranty_expires_at TIMESTAMP NULL,
    product_info TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **Table `user_roles_backup`**
```sql
CREATE TABLE user_roles_backup (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(20) NOT NULL,
    has_premium BOOLEAN DEFAULT FALSE,
    has_warranty BOOLEAN DEFAULT FALSE,
    code_linked BOOLEAN DEFAULT FALSE,
    warranty_expires_at TIMESTAMP NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);
```

#### **Table `support_tickets`**
```sql
CREATE TABLE support_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id VARCHAR(50) UNIQUE NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    channel_id VARCHAR(20) NOT NULL,
    type ENUM('coaster', 'discord', 'staff') NOT NULL,
    status ENUM('open', 'assigned', 'resolved', 'closed') DEFAULT 'open',
    assigned_to VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium'
);
```

#### **Table `moderation_logs`**
```sql
CREATE TABLE moderation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(20) NOT NULL,
    moderator_id VARCHAR(20) NULL,
    action_type VARCHAR(20) NOT NULL,
    reason TEXT NULL,
    duration INTEGER NULL,
    points_added INTEGER DEFAULT 0,
    message_content TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **Table `user_points`**
```sql
CREATE TABLE user_points (
    user_id VARCHAR(20) PRIMARY KEY,
    total_points INTEGER DEFAULT 0,
    last_offense TIMESTAMP NULL,
    is_banned BOOLEAN DEFAULT FALSE
);
```

#### **Table `role_restoration_logs`**
```sql
CREATE TABLE role_restoration_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(20) NOT NULL,
    roles_restored TEXT NOT NULL,
    restored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    trigger_type ENUM('rejoin', 'manual', 'scheduled') NOT NULL
);
```

#### **Table `warranty_activation_logs`**
```sql
CREATE TABLE warranty_activation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(20) NOT NULL,
    admin_id VARCHAR(20) NOT NULL,
    code_id INTEGER NOT NULL,
    action_type ENUM('activate', 'extend', 'deactivate') NOT NULL,
    duration_days INTEGER NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (code_id) REFERENCES warranty_premium_codes(id)
);
```

### **Relations**
- A user can have one linked warranty/premium code
- A code can be activated or not by an admin
- A user has role backup in `user_roles_backup`
- A ticket belongs to a user and can be assigned to staff
- Moderation logs are linked to users
- Restoration logs track role re-assignments
- Activation logs track admin actions on warranties

---

## 🔑 **Configuration and Permissions**

### **Required Discord Roles**

#### **User Roles**
- `🎖️ Premium` : Premium status (automatically assigned with warranty)
- `🛡️ Garantie Active` : Users with valid warranty
- `🔇 Muted` : Temporarily muted users

#### **Staff Roles**
- `👑 Admin` : Full bot access + warranty activation
- `🛠️ Modérateur` : Moderation and ticket management
- `💼 Support` : Customer ticket management only
- `🏭 Technique` : Product technical support
- `📋 Garantie Manager` : Specific warranty management (optional)

### **Bot Permissions**
```json
{
  "permissions": [
    "SEND_MESSAGES",
    "MANAGE_MESSAGES",
    "MANAGE_CHANNELS",
    "MANAGE_ROLES",
    "BAN_MEMBERS",
    "KICK_MEMBERS",
    "MODERATE_MEMBERS",
    "READ_MESSAGE_HISTORY",
    "EMBED_LINKS",
    "ATTACH_FILES",
    "USE_SLASH_COMMANDS",
    "VIEW_GUILD_INSIGHTS"
  ]
}
```

### **Channel Configuration**

#### **Public Channels**
- `#📦・warranty-activation` : Warranty and premium activation
- `#❓・support` : Ticket creation

#### **Staff-only Channels**
- `#📁・logs-moderation` : Moderation logs
- `#📊・bot-stats` : Bot statistics
- `#⚙️・bot-config` : Administrative configuration
- `#🔄・role-logs` : Role re-assignment logs

#### **Dynamic Categories**
- `🎫 TICKETS SUPPORT` : Customer tickets
- `📨 CANDIDATURES` : Staff applications

---

## 📝 **Technical Notes**

### **Prerequisites**
- Node.js 18+ installed
- MySQL database
- Discord server with appropriate permissions
- Valid Discord bot token

### **Environment Variables**
```env
DISCORD_TOKEN=your_bot_token
DATABASE_URL=your_database_url
GUILD_ID=your_server_id
LOG_LEVEL=info
NODE_ENV=production
```

### **Startup Commands**
```bash
npm install
npm start
```

### **Critical Discord Events**
- `guildMemberAdd` : Automatic role re-assignment
- `guildMemberRemove` : Role backup before departure
- `ready` : Role integrity check at startup

---

*Document created on July 4, 2025 - Version 2.0*  
*Author : Yamakajump™*
