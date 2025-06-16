import { SlashCommandBuilder } from 'discord.js';

// Store user game data in memory
const games = {};

export const data = new SlashCommandBuilder()
  .setName('guess')
  .setDescription('Play the number guessing game! Guess a number between 1 and 100.')
  .addIntegerOption(option =>
    option.setName('number')
      .setDescription('Your guess')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100)
  );

export async function execute(interaction) {
  const guess = interaction.options.getInteger('number');
  const userId = interaction.user.id;

  if (!games[userId]) {
    games[userId] = {
      target: Math.floor(Math.random() * 100) + 1,
      attempts: 0,
    };
    await interaction.reply({
      content: `🎲 New game started! Try to guess the number between 1 and 100.`,
      ephemeral: true,
    });
    return;
  }

  const game = games[userId];
  game.attempts++;

  if (guess === game.target) {
    await interaction.reply(`🎉 Congrats! You guessed the number **${game.target}** in ${game.attempts} attempts! Starting a new game now.`);
    games[userId] = {
      target: Math.floor(Math.random() * 100) + 1,
      attempts: 0,
    };
  } else if (guess < game.target) {
    await interaction.reply(`⬆️ Too low! Try a higher number.`);
  } else {
    await interaction.reply(`⬇️ Too high! Try a lower number.`);
  }
}
