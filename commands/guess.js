import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

const MAX_NUMBER = 100;

export const data = new SlashCommandBuilder()
  .setName('guess')
  .setDescription('Play the number guessing game! Guess a number between 1 and 100.')
  .addIntegerOption(option =>
    option.setName('number')
      .setDescription('Your guess')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(MAX_NUMBER));

export async function execute(interaction) {
  // Initialize game target if none exists
  if (!interaction.client.guessTarget) {
    interaction.client.guessTarget = Math.floor(Math.random() * MAX_NUMBER) + 1;
    interaction.client.gameFinished = false;
  }

  const target = interaction.client.guessTarget;
  const guess = interaction.options.getInteger('number');

  // Play Again button setup
  const playAgainRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('play_again')
        .setLabel('Play Again')
        .setStyle(ButtonStyle.Primary),
    );

  // If game already finished, prevent guesses until restart
  if (interaction.client.gameFinished) {
    await interaction.reply({ content: 'The game has ended! Click **Play Again** to start a new game.', components: [playAgainRow], ephemeral: true });
    return;
  }

  // First interaction - use reply; subsequent guesses - use followUp
  const replyMethod = interaction.replied || interaction.deferred ? 'followUp' : 'reply';

  if (guess === target) {
    interaction.client.gameFinished = true;

    await interaction[replyMethod]({
      content: `🎉 Congrats, you guessed it right! The number was **${target}**.`,
      components: [playAgainRow],
      ephemeral: true,
    });

    // Wait for the user to press the Play Again button
    const filter = i => i.customId === 'play_again' && i.user.id === interaction.user.id;

    try {
      const buttonInteraction = await interaction.channel.awaitMessageComponent({
        filter,
        componentType: ComponentType.Button,
        time: 60000,
      });

      // Reset game state
      interaction.client.guessTarget = Math.floor(Math.random() * MAX_NUMBER) + 1;
      interaction.client.gameFinished = false;

      await buttonInteraction.update({
        content: `🔄 New game started! Guess a number between 1 and ${MAX_NUMBER}.`,
        components: [],
      });
    } catch {
      // Timeout: disable button after 60 seconds
      await interaction.editReply({
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('play_again')
            .setLabel('Play Again')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true)
        )],
      });
    }

  } else if (guess > target) {
    await interaction[replyMethod]({ content: `⬇️ ${guess} is too high! Try a lower number.`, ephemeral: true });
  } else {
    await interaction[replyMethod]({ content: `⬆️ ${guess} is too low! Try a higher number.`, ephemeral: true });
  }
}
