import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const userStreaks = new Map();
const games = new Map();

export const data = new SlashCommandBuilder()
  .setName('guess')
  .setDescription('Guess a number between 1 and 100')
  .addIntegerOption(option =>
    option.setName('number')
      .setDescription('Your guess')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100));

export async function execute(interaction) {
  const userId = interaction.user.id;
  const guess = interaction.options.getInteger('number');

  // Start new game for user if none
  if (!games.has(userId)) {
    const numberToGuess = Math.floor(Math.random() * 100) + 1;
    games.set(userId, { numberToGuess, guessed: false });
  }

  const game = games.get(userId);

  if (game.guessed) {
    return interaction.reply({ content: "You already guessed the number! Click 'Play Again' to start a new game.", ephemeral: true });
  }

  if (guess === game.numberToGuess) {
    game.guessed = true;

    // Increase streak
    const prevStreak = userStreaks.get(userId) || 0;
    userStreaks.set(userId, prevStreak + 1);

    // Button to play again
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('play_again')
          .setLabel('Play Again')
          .setStyle(ButtonStyle.Primary),
      );

    await interaction.reply({
      content: `🎉 Congrats! You guessed it right. The number was ${guess}. Your current win streak is ${userStreaks.get(userId)} 🔥`,
      components: [row],
      ephemeral: true,
    });
  } else if (guess < game.numberToGuess) {
    await interaction.reply({ content: `⬆️ ${guess} is too low! Try a higher number.`, ephemeral: true });
  } else {
    await interaction.reply({ content: `⬇️ ${guess} is too high! Try a lower number.`, ephemeral: true });
  }
}

// Handle button interaction for "Play Again"
export async function handleButton(interaction) {
  if (interaction.customId === 'play_again') {
    const userId = interaction.user.id;

    // Reset game for user
    const numberToGuess = Math.floor(Math.random() * 100) + 1;
    games.set(userId, { numberToGuess, guessed: false });

    await interaction.update({
      content: '🎲 New game started! Guess a number between 1 and 100 using /guess <number>.',
      components: [],
      ephemeral: true,
    });
  }
}
