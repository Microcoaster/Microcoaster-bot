/**
 * Gestionnaire de l'événement "ready".
 *
 * Ce module est déclenché une seule fois lorsque le bot est connecté et prêt.
 * Il affiche un message de confirmation dans la console et vérifie l'intégrité des rôles.
 */

const WarrantyDAO = require('../dao/warrantyDAO');
const warrantyDAO = new WarrantyDAO();
const cron = require('node-cron');

module.exports = {
  name: "ready",
  once: true,
  /**
   * Méthode exécutée lors du déclenchement de l'événement "ready".
   *
   * @param {Client} client - L'instance du bot Discord.
   */
  async execute(client) {
    console.log(`
  \x1b[38;2;210;130;0m ███╗   ███╗██╗ ██████╗██████╗  ██████╗  ██████╗ ██████╗  █████╗ ███████╗████████╗███████╗██████╗ 
  \x1b[38;2;205;120;0m ████╗ ████║██║██╔════╝██╔══██╗██╔═══██╗██╔════╝██╔═══██╗██╔══██╗██╔════╝╚══██╔══╝██╔════╝██╔══██╗
  \x1b[38;2;200;110;0m ██╔████╔██║██║██║     ██████╔╝██║   ██║██║     ██║   ██║███████║███████╗   ██║   █████╗  ██████╔╝
  \x1b[38;2;195;100;0m ██║╚██╔╝██║██║██║     ██╔══██╗██║   ██║██║     ██║   ██║██╔══██║╚════██║   ██║   ██╔══╝  ██╔══██╗
  \x1b[38;2;190;90;0m ██║ ╚═╝ ██║██║╚██████╗██║  ██║╚██████╔╝╚██████╗╚██████╔╝██║  ██║███████║   ██║   ███████╗██║  ██║
  \x1b[38;2;185;80;0m ╚═╝     ╚═╝╚═╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝\x1b[0m
                                    🎢 Premium 3D Printed Microcoaster™ Support Bot 🎢
`);

    console.log(
      `\x1b[0m🚀  Le bot est prêt ! Connecté en tant que \x1b[38;5;45m${client.user.tag}\x1b[0m (\x1b[38;5;45m${client.user.id}\x1b[0m)`,
    );

    console.log(
      `\x1b[38;5;2m📊  Statistiques :\x1b[0m`,
    );
    console.log(
      `   • Serveurs : \x1b[38;5;45m${client.guilds.cache.size}\x1b[0m`,
    );
    console.log(
      `   • Utilisateurs : \x1b[38;5;45m${client.users.cache.size}\x1b[0m`,
    );
    console.log(
      `   • Commandes chargées : \x1b[38;5;45m${client.commands?.size || 0}\x1b[0m`,
    );

    // Optionnel : définir le statut du bot depuis la configuration
    const config = require('../config/config.json');
    const activityType = config.bot.activity_type || 'WATCHING';
    const status = config.bot.status || 'MicroCoaster™ Support | /help';
    
    client.user.setActivity(status, { type: activityType });

    // Vérification de l'intégrité des rôles au démarrage
    console.log('\x1b[38;5;3m🔍  Vérification de l\'intégrité des rôles...\x1b[0m');
    try {
      await verifyRoleIntegrity(client);
      console.log('\x1b[38;5;2m✅  Vérification des rôles terminée.\x1b[0m');
    } catch (error) {
      console.error('\x1b[38;5;1m❌  Erreur lors de la vérification des rôles:\x1b[0m', error);
    }

    // Vérification des tickets au démarrage
    console.log('\x1b[38;5;3m🎫  Vérification de l\'intégrité des tickets...\x1b[0m');
    try {
      await verifyTicketIntegrity(client);
      console.log('\x1b[38;5;2m✅  Vérification des tickets terminée.\x1b[0m');
    } catch (error) {
      console.error('\x1b[38;5;1m❌  Erreur lors de la vérification des tickets:\x1b[0m', error);
    }

    // Programmation des tâches cron pour les rappels de garantie
    console.log('\x1b[38;5;3m⏰  Programmation des tâches automatiques...\x1b[0m');
    setupCronJobs(client);
    console.log('\x1b[38;5;2m✅  Tâches automatiques programmées.\x1b[0m');
  },
};

/**
 * Vérifie l'intégrité des rôles de tous les utilisateurs
 */
async function verifyRoleIntegrity(client) {
  try {
    const config = require('../config/config.json');
    const guilds = client.guilds.cache;
    
    console.log(`🔍  Vérification de ${guilds.size} serveur(s)`);
    
    for (const [guildId, guild] of guilds) {
      console.log(`🔍  Vérification du serveur: ${guild.name}`);
      
      try {
        // Récupérer tous les utilisateurs avec des garanties actives avec timeout
        const activeWarranties = await Promise.race([
          warrantyDAO.getActiveWarranties(guildId),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('connect ETIMEDOUT')), 60000) // 1 minute timeout
          )
        ]);
        
        // Vérifier que activeWarranties est un tableau
        if (!Array.isArray(activeWarranties)) {
          console.log(`   ⚠️  Résultat inattendu de getActiveWarranties:`, typeof activeWarranties);
          console.log(`   Aucune garantie active trouvée pour ${guild.name}`);
          continue;
        }
        
        console.log(`   Trouvé ${activeWarranties.length} garanties actives`);
        
        let rolesRestored = 0;
        
        for (const warranty of activeWarranties) {
          try {
            const member = await guild.members.fetch(warranty.user_id);
            if (!member) continue;

            const premiumRole = guild.roles.cache.get(config.roles.premium_role_id);
            const warrantyRole = guild.roles.cache.get(config.roles.warranty_role_id);
            
            let rolesAdded = [];
            
            // Vérifier et restaurer le rôle premium
            if (premiumRole && !member.roles.cache.has(config.roles.premium_role_id)) {
              await member.roles.add(premiumRole);
              rolesAdded.push('Premium');
            }
            
            // Vérifier et restaurer le rôle de garantie si elle n'a pas expiré
            const now = new Date();
            const expirationDate = new Date(warranty.warranty_expires_at);
            
            if (warrantyRole && expirationDate > now && !member.roles.cache.has(config.roles.warranty_role_id)) {
              await member.roles.add(warrantyRole);
              rolesAdded.push('Warranty');
            }
            
            if (rolesAdded.length > 0) {
              rolesRestored++;
              console.log(`   ↳ Rôles restaurés pour ${member.user.tag}: ${rolesAdded.join(', ')}`);
              
              // Logger la restauration
              await warrantyDAO.logWarrantyAction({
                warranty_id: warranty.warranty_id,
                user_id: warranty.user_id,
                guild_id: guildId,
                action_type: 'ROLES_RESTORED',
                action_details: `Startup verification restored roles: ${rolesAdded.join(', ')}`,
                performed_by: client.user.id
              });
            }
            
          } catch {
            console.log(`   ⚠️  Utilisateur ${warranty.user_id} non trouvé dans le serveur`);
          }
        }
        
        if (rolesRestored > 0) {
          console.log(`   ✅ ${rolesRestored} utilisateur(s) ont eu leurs rôles restaurés`);
        } else {
          console.log(`   ✅ Aucun rôle à restaurer`);
        }
        
      } catch (guildError) {
        console.error(`   ❌ Erreur lors de la vérification du serveur ${guild.name}:`, guildError.message);
      }
    }
    
    console.log(`✅ Vérification de l'intégrité terminée pour tous les serveurs`);
    
  } catch (error) {
    console.error('❌ Erreur critique lors de la vérification des rôles:', error);
  }
}

/**
 * Vérifie l'intégrité des tickets de tous les utilisateurs
 */
async function verifyTicketIntegrity(client) {
  try {
    const TicketDAO = require('../dao/ticketDAO');
    const ticketDAO = new TicketDAO();
    
    // Récupérer tous les tickets ouverts
    const openTickets = await ticketDAO.getAllOpenTicketsWithChannels();
    console.log(`🔍  Vérification de ${openTickets.length} ticket(s) ouvert(s)`);
    
    if (openTickets.length === 0) {
      console.log('   ℹ️  Aucun ticket ouvert à vérifier');
      return;
    }
    
    let deletedTickets = 0;
    let validTickets = 0;
    
    for (const ticket of openTickets) {
      try {
        let channelFound = false;
        
        // Chercher le salon dans tous les serveurs
        for (const [, guild] of client.guilds.cache) {
          const channel = guild.channels.cache.get(ticket.channel_id);
          if (channel) {
            channelFound = true;
            console.log(`   ✅ Ticket ${ticket.ticket_id}: salon trouvé dans ${guild.name}`);
            validTickets++;
            break;
          }
        }
        
        // Si le salon n'existe plus, supprimer le ticket
        if (!channelFound) {
          console.log(`   🗑️  Ticket ${ticket.ticket_id}: salon ${ticket.channel_id} non trouvé, suppression...`);
          const deleted = await ticketDAO.deleteTicket(ticket.ticket_id);
          
          if (deleted) {
            deletedTickets++;
            console.log(`   ✅ Ticket ${ticket.ticket_id} supprimé avec succès`);
          } else {
            console.log(`   ❌ Échec de la suppression du ticket ${ticket.ticket_id}`);
          }
        }
        
      } catch (ticketError) {
        console.error(`   ❌ Erreur lors de la vérification du ticket ${ticket.ticket_id}:`, ticketError.message);
      }
    }
    
    console.log(`✅ Vérification terminée: ${validTickets} tickets valides, ${deletedTickets} tickets supprimés`);
    
  } catch (error) {
    console.error('❌ Erreur critique lors de la vérification des tickets:', error);
  }
};

/**
 * Configure les tâches automatiques (cron jobs)
 */
function setupCronJobs(client) {
  // Tâche quotidienne à 9h00 pour vérifier les garanties expirant
  cron.schedule('0 9 * * *', async () => {
    console.log('🔔  Vérification des rappels de garantie...');
    try {
      await checkWarrantyReminders(client);
    } catch (error) {
      console.error('Erreur lors de la vérification des rappels:', error);
    }
  });

  // Tâche hebdomadaire le dimanche à 10h00 pour nettoyer les données expirées
  cron.schedule('0 10 * * 0', async () => {
    console.log('🧹  Nettoyage des données expirées...');
    try {
      await cleanupExpiredData(client);
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
    }
  });
}

/**
 * Vérifie les garanties nécessitant des rappels
 */
async function checkWarrantyReminders(client) {
  try {
    const guilds = client.guilds.cache;
    
    for (const [guildId] of guilds) {
      // Rappels à 11 mois (30 jours avant expiration)
      const warrantiesNearExpiration = await warrantyDAO.getWarrantiesNearExpiration(guildId, 30);
      
      for (const warranty of warrantiesNearExpiration) {
        try {
          const user = await client.users.fetch(warranty.user_id);
          const expirationDate = new Date(warranty.warranty_expires_at);
          
          const reminderEmbed = {
            color: 0xff9900,
            title: '⚠️ Warranty Expiration Reminder',
            description: 'Your MicroCoaster™ warranty will expire soon.',
            fields: [
              {
                name: 'Expiration Date',
                value: `<t:${Math.floor(expirationDate.getTime() / 1000)}:F>`,
                inline: true
              },
              {
                name: 'Days Remaining',
                value: `${Math.ceil((expirationDate - new Date()) / (1000 * 60 * 60 * 24))} days`,
                inline: true
              },
              {
                name: 'Next Steps',
                value: 'Contact our support team if you need assistance with renewal or have any questions.',
                inline: false
              }
            ],
            footer: { text: 'Thank you for choosing MicroCoaster™!' },
            timestamp: new Date().toISOString()
          };

          await user.send({ embeds: [reminderEmbed] });
          
          // Marquer le rappel comme envoyé
          await warrantyDAO.markReminderSent(warranty.warranty_id, '30_days');
          
        } catch (userError) {
          console.log(`Impossible d'envoyer un rappel à l'utilisateur ${warranty.user_id}: ${userError.message}`);
        }
      }
      
      // Rappels à 7 jours avant expiration
      const warrantiesVeryNearExpiration = await warrantyDAO.getWarrantiesNearExpiration(guildId, 7);
      
      for (const warranty of warrantiesVeryNearExpiration) {
        try {
          const user = await client.users.fetch(warranty.user_id);
          const expirationDate = new Date(warranty.warranty_expires_at);
          
          const finalReminderEmbed = {
            color: 0xff0000,
            title: '🚨 Final Warranty Expiration Notice',
            description: 'Your MicroCoaster™ warranty expires in less than 7 days!',
            fields: [
              {
                name: 'Expiration Date',
                value: `<t:${Math.floor(expirationDate.getTime() / 1000)}:F>`,
                inline: true
              },
              {
                name: 'Days Remaining',
                value: `${Math.ceil((expirationDate - new Date()) / (1000 * 60 * 60 * 24))} days`,
                inline: true
              },
              {
                name: 'Important',
                value: 'After expiration, you will lose access to warranty benefits. Contact support immediately if you need assistance.',
                inline: false
              }
            ],
            footer: { text: 'Thank you for choosing MicroCoaster™!' },
            timestamp: new Date().toISOString()
          };

          await user.send({ embeds: [finalReminderEmbed] });
          
          // Marquer le rappel comme envoyé
          await warrantyDAO.markReminderSent(warranty.warranty_id, '7_days');
          
        } catch (userError) {
          console.log(`Impossible d'envoyer un rappel final à l'utilisateur ${warranty.user_id}: ${userError.message}`);
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des rappels de garantie:', error);
  }
}

/**
 * Nettoie les données expirées
 */
async function cleanupExpiredData(client) {
  try {
    const guilds = client.guilds.cache;
    const config = require('../config/config.json');
    
    for (const [guildId, guild] of guilds) {
      // Récupérer les garanties expirées
      const expiredWarranties = await warrantyDAO.getExpiredWarranties();
      
      for (const warranty of expiredWarranties) {
        try {
          const member = await guild.members.fetch(warranty.user_id);
          if (member && config.roles.warranty_role_id) {
            const warrantyRole = guild.roles.cache.get(config.roles.warranty_role_id);
            
            if (warrantyRole && member.roles.cache.has(config.roles.warranty_role_id)) {
              await member.roles.remove(warrantyRole);
              console.log(`Rôle de garantie retiré pour ${member.user.tag} (garantie expirée)`);
              
              // Logger l'action
              await warrantyDAO.logWarrantyAction({
                warranty_id: warranty.warranty_id,
                user_id: warranty.user_id,
                guild_id: guildId,
                action_type: 'WARRANTY_EXPIRED',
                action_details: 'Warranty role automatically removed due to expiration',
                performed_by: client.user.id
              });
              
              // Envoyer un DM d'information
              try {
                const expiredEmbed = {
                  color: 0xff6b6b,
                  title: '📅 Warranty Expired',
                  description: 'Your MicroCoaster™ warranty has expired.',
                  fields: [
                    {
                      name: 'Expiration Date',
                      value: `<t:${Math.floor(new Date(warranty.warranty_expires_at).getTime() / 1000)}:F>`,
                      inline: true
                    },
                    {
                      name: 'Premium Access',
                      value: 'Your premium access remains active.',
                      inline: true
                    },
                    {
                      name: 'Need Help?',
                      value: 'Contact our support team if you have questions about renewal or need assistance.',
                      inline: false
                    }
                  ],
                  footer: { text: 'Thank you for choosing MicroCoaster™!' },
                  timestamp: new Date().toISOString()
                };

                await member.user.send({ embeds: [expiredEmbed] });
              } catch (dmError) {
                console.log(`Impossible d'envoyer un DM d'expiration à ${member.user.tag}: ${dmError.message}`);
              }
            }
          }
        } catch {
          console.log(`Membre ${warranty.user_id} non trouvé lors du nettoyage`);
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors du nettoyage des données expirées:', error);
  }
};
