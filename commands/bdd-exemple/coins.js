/**
 * Sous-commande : coins
 * Gère la monnaie virtuelle du bot (coins)
 */

const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const exempleDAO = require("../../dao/exempleDAO");

module.exports = {
  async execute(interaction) {
    // S'assurer que l'utilisateur existe en base
    await exempleDAO.createUser(
      interaction.user.id,
      interaction.user.username,
      interaction.user.displayName
    );

    // Incrémenter l'usage de commande
    await exempleDAO.incrementCommandUsage(interaction.user.id, "bdd-exemple coins");

    const action = interaction.options.getString("action");
    const quantite = interaction.options.getInteger("quantite");
    const targetUser = interaction.options.getUser("utilisateur");

    switch (action) {
      case "voir":
        await handleVoirCoins(interaction, targetUser);
        break;
      case "ajouter":
        await handleAjouterCoins(interaction, quantite, targetUser);
        break;
      case "retirer":
        await handleRetirerCoins(interaction, quantite, targetUser);
        break;
      case "daily":
        await handleDailyCoins(interaction);
        break;
    }
  },
};

/**
 * Affiche les coins d'un utilisateur
 */
async function handleVoirCoins(interaction, targetUser) {
  const user = targetUser || interaction.user;
  
  // S'assurer que l'utilisateur cible existe
  await exempleDAO.createUser(
    user.id,
    user.username,
    user.displayName
  );

  const userData = await exempleDAO.getUser(user.id);
  
  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(`💰 Coins de ${user.username}`)
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: "💎 Coins possédés", value: `${userData.coins} coins`, inline: true },
      { name: "🎯 Niveau", value: userData.level.toString(), inline: true },
      { name: "👑 Premium", value: userData.is_premium ? "Oui" : "Non", inline: true }
    )
    .setFooter({ text: "Utilisez /bdd-exemple coins daily pour récupérer vos coins quotidiens !" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

/**
 * Ajoute des coins à un utilisateur (admin seulement)
 */
async function handleAjouterCoins(interaction, quantite, targetUser) {
  // Vérification des permissions admin
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return await interaction.reply({
      content: "❌ Vous devez être administrateur pour utiliser cette fonction.",
      ephemeral: true
    });
  }

  if (!quantite) {
    return await interaction.reply({
      content: "❌ Vous devez spécifier une quantité de coins à ajouter.",
      ephemeral: true
    });
  }

  const user = targetUser || interaction.user;
  
  // S'assurer que l'utilisateur cible existe
  await exempleDAO.createUser(
    user.id,
    user.username,
    user.displayName
  );

  const userData = await exempleDAO.getUser(user.id);
  const newCoins = userData.coins + quantite;

  await exempleDAO.updateUser(user.id, { coins: newCoins });

  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle("💰 Coins ajoutés !")
    .setDescription(`${quantite} coins ont été ajoutés à ${user.username}`)
    .addFields(
      { name: "💎 Anciens coins", value: `${userData.coins} coins`, inline: true },
      { name: "➕ Coins ajoutés", value: `+${quantite} coins`, inline: true },
      { name: "💰 Nouveaux coins", value: `${newCoins} coins`, inline: true }
    )
    .setFooter({ text: `Action effectuée par ${interaction.user.username}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

/**
 * Retire des coins à un utilisateur (admin seulement)
 */
async function handleRetirerCoins(interaction, quantite, targetUser) {
  // Vérification des permissions admin
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return await interaction.reply({
      content: "❌ Vous devez être administrateur pour utiliser cette fonction.",
      ephemeral: true
    });
  }

  if (!quantite) {
    return await interaction.reply({
      content: "❌ Vous devez spécifier une quantité de coins à retirer.",
      ephemeral: true
    });
  }

  const user = targetUser || interaction.user;
  
  // S'assurer que l'utilisateur cible existe
  await exempleDAO.createUser(
    user.id,
    user.username,
    user.displayName
  );

  const userData = await exempleDAO.getUser(user.id);
  
  if (userData.coins < quantite) {
    return await interaction.reply({
      content: `❌ ${user.username} n'a que ${userData.coins} coins, impossible de retirer ${quantite} coins.`,
      ephemeral: true
    });
  }

  const newCoins = userData.coins - quantite;
  await exempleDAO.updateUser(user.id, { coins: newCoins });

  const embed = new EmbedBuilder()
    .setColor(0xFF6B6B)
    .setTitle("💸 Coins retirés")
    .setDescription(`${quantite} coins ont été retirés à ${user.username}`)
    .addFields(
      { name: "💎 Anciens coins", value: `${userData.coins} coins`, inline: true },
      { name: "➖ Coins retirés", value: `-${quantite} coins`, inline: true },
      { name: "💰 Nouveaux coins", value: `${newCoins} coins`, inline: true }
    )
    .setFooter({ text: `Action effectuée par ${interaction.user.username}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

/**
 * Récupère les coins quotidiens
 */
async function handleDailyCoins(interaction) {
  const userData = await exempleDAO.getUser(interaction.user.id);
  
  // Vérifier si l'utilisateur a déjà récupéré ses coins aujourd'hui
  const lastDaily = userData.preferences?.lastDaily;
  const today = new Date().toDateString();
  
  if (lastDaily === today) {
    return await interaction.reply({
      content: "❌ Vous avez déjà récupéré vos coins quotidiens aujourd'hui ! Revenez demain.",
      ephemeral: true
    });
  }

  // Calculer les coins quotidiens (basé sur le niveau)
  const baseDaily = 50;
  const levelBonus = userData.level * 10;
  const premiumBonus = userData.is_premium ? 25 : 0;
  const totalDaily = baseDaily + levelBonus + premiumBonus;

  // Mettre à jour les coins et la date
  const newCoins = userData.coins + totalDaily;
  await exempleDAO.updateUser(interaction.user.id, { coins: newCoins });
  
  // Mettre à jour les préférences pour marquer la date
  const preferences = userData.preferences || {};
  preferences.lastDaily = today;
  await exempleDAO.updateStats(interaction.user.id, { preferences });

  const embed = new EmbedBuilder()
    .setColor(0x00FFD4)
    .setTitle("🎁 Coins quotidiens récupérés !")
    .setDescription("Vous avez récupéré vos coins quotidiens avec succès !")
    .addFields(
      { name: "💰 Base quotidienne", value: `${baseDaily} coins`, inline: true },
      { name: "🎯 Bonus niveau", value: `+${levelBonus} coins`, inline: true },
      { name: "👑 Bonus premium", value: `+${premiumBonus} coins`, inline: true },
      { name: "🎉 Total reçu", value: `**${totalDaily} coins**`, inline: false },
      { name: "💎 Nouveaux coins", value: `${newCoins} coins`, inline: true }
    )
    .setFooter({ text: "Revenez demain pour plus de coins !" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
