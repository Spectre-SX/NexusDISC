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
  let target = interaction.client.guessTarget;

  // If no current target, pick a new number and store it on client
  if (!target) {
    target = Math.floor(Math.random() * MAX_NUMBER) + 1;
    interaction.client.guessTarget = target;
  }

  const guess = interaction.options.getInteger('number');

  // Helper to create "Play Again" button row
  const playAgainRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('play_again')
        .setLabel('Play Again')
        .setStyle(ButtonStyle.Primary),
    );

  // Check guess and respond
  if (guess === target) {
    // You got it right!
    // Reply with a congrats message and Play Again button
    await interaction.reply({
      content: `🎉 Congrats, you guessed it right! The number was **${target}**.`,
      components: [playAgainRow],
      ephemeral: true,
    });

    // Now wait for button interaction from this user only, for 60 seconds
    const filter = i => i.customId === 'play_again' && i.user.id === interaction.user.id;

    try {
      const buttonInteraction = await interaction.channel.awaitMessageComponent({ filter, componentType: ComponentType.Button, time: 60000 });

      // Reset the target to start a new game
      interaction.client.guessTarget = Math.floor(Math.random() * MAX_NUMBER) + 1;

      // Update the original reply (disable button)
      await buttonInteraction.update({
        content: `🔄 New game started! Guess a number between 1 and ${MAX_NUMBER}.`,
        components: [],
      });
    } catch {
      // Timeout: disable the button after 60s
      await interaction.editReply({
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('play_again')
            .setLabel('Play Again')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true)
        )]
      });
    }

  } else if (guess > target) {
    await interaction.reply({ content: `⬇️ ${guess} is too high! Try a lower number.`, ephemeral: true });
  } else {
    await interaction.reply({ content: `⬆️ ${guess} is too low! Try a higher number.`, ephemeral: true });
  }
}
