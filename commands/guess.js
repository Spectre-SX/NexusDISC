const { SlashCommandBuilder } = require('discord.js');

// This object stores ongoing games per user ID
const games = {};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guess')
    .setDescription('Play the number guessing game! Guess a number between 1 and 100.')
    .addIntegerOption(option =>
      option.setName('number')
        .setDescription('Your guess')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  async execute(interaction) {
    const guess = interaction.options.getInteger('number');
    const userId = interaction.user.id;

    // If no game running for user, start a new game with random number 1-100
    if (!games[userId]) {
      games[userId] = {
        target: Math.floor(Math.random() * 100) + 1,
        attempts: 0,
      };
      await interaction.reply({
        content: `🎲 New game started! Try to guess the number between 1 and 100.`,
        ephemeral: true,
      });
      return; // don't check guess on first call — user must guess next time
    }

    const game = games[userId];
    game.attempts++;

    if (guess === game.target) {
      await interaction.reply(`🎉 Congrats! You guessed the number **${game.target}** in ${game.attempts} attempts! Starting a new game now.`);
      // Reset game after winning
      games[userId] = {
        target: Math.floor(Math.random() * 100) + 1,
        attempts: 0,
      };
    } else if (guess < game.target) {
      await interaction.reply(`⬆️ Too low! Try a higher number.`);
    } else {
      await interaction.reply(`⬇️ Too high! Try a lower number.`);
    }
  },
};
