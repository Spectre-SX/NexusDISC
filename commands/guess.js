import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const MAX_NUMBER = 100;

export const data = new SlashCommandBuilder()
  .setName('guess')
  .setDescription('Start a number guessing game!');

export async function execute(interaction) {
  // Start the game by generating a target number and saving in client
  interaction.client.guessTarget = Math.floor(Math.random() * MAX_NUMBER) + 1;
  interaction.client.guessActive = true;

  await interaction.reply({
    content: `I picked a number between 1 and ${MAX_NUMBER}. Try to guess it by typing /guess <number>!`,
    ephemeral: true,
  });
}

// This is a separate command for the actual guess input, so you can do: /guess 42
// Or if you want the guess input as an option on the same command, just adjust accordingly

export async function handleGuess(interaction, guess) {
  const target = interaction.client.guessTarget;
  const active = interaction.client.guessActive;

  if (!active) {
    return interaction.reply({ content: 'No active game! Use /guess to start one.', ephemeral: true });
  }

  if (typeof guess !== 'number' || guess < 1 || guess > MAX_NUMBER) {
    return interaction.reply({ content: `Your guess must be a number between 1 and ${MAX_NUMBER}.`, ephemeral: true });
  }

  if (guess === target) {
    interaction.client.guessActive = false; // end game

    // Show congrats + "Play Again" button
    const playAgainButton = new ButtonBuilder()
      .setCustomId('playAgain')
      .setLabel('Play Again')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(playAgainButton);

    await interaction.reply({
      content: `🎉 You guessed it! The number was **${target}**.`,
      components: [row],
      ephemeral: false,
    });
  } else if (guess > target) {
    await interaction.reply({ content: `⬇️ ${guess} is too high! Try a lower number.`, ephemeral: true });
  } else {
    await interaction.reply({ content: `⬆️ ${guess} is too low! Try a higher number.`, ephemeral: true });
  }
}

// You also need to handle the button click to restart the game:

export async function handleButton(interaction) {
  if (interaction.customId === 'playAgain') {
    interaction.client.guessTarget = Math.floor(Math.random() * MAX_NUMBER) + 1;
    interaction.client.guessActive = true;

    await interaction.update({
      content: `Game restarted! I've picked a new number between 1 and ${MAX_NUMBER}. Guess it by typing /guess <number>.`,
      components: [],
    });
  }
}
