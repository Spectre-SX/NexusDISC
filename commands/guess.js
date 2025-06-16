import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  ComponentType,
  InteractionType
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('guess')
  .setDescription('Guess a number between 1 and 10!');

export async function execute(interaction) {
  const targetNumber = Math.floor(Math.random() * 10) + 1;

  const embed = new EmbedBuilder()
    .setTitle('🎯 Number Guessing Game')
    .setDescription('I picked a number between **1** and **10**.\nPress **Try Guess** to enter your guess!')
    .setColor(0x5865F2);

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('guess_input')
      .setLabel('Try Guess')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('guess_giveup')
      .setLabel('Give Up')
      .setStyle(ButtonStyle.Danger)
  );

  await interaction.reply({
    embeds: [embed],
    components: [buttons],
    ephemeral: true
  });

  const message = await interaction.fetchReply();

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60_000
  });

  collector.on('collect', async (btnInteraction) => {
    if (btnInteraction.user.id !== interaction.user.id)
      return btnInteraction.reply({ content: 'Bro this ain’t your game 😤', ephemeral: true });

    if (btnInteraction.customId === 'guess_giveup') {
      await btnInteraction.update({
        content: `😢 You gave up! The number was **${targetNumber}**.`,
        embeds: [],
        components: []
      });
      collector.stop();
      return;
    }

    if (btnInteraction.customId === 'guess_input') {
      const modal = new ModalBuilder()
        .setCustomId('guess_modal')
        .setTitle('Your Guess');

      const input = new TextInputBuilder()
        .setCustomId('guess_number')
        .setLabel('Enter a number (1-10)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(2);

      const row = new ActionRowBuilder().addComponents(input);
      modal.addComponents(row);

      await btnInteraction.showModal(modal);
    }
  });

  // Handle modal submission
  const modalCollector = interaction.channel.createMessageComponentCollector({
    componentType: ComponentType.ModalSubmit,
    time: 60_000
  });

  modalCollector.on('collect', async (modalInteraction) => {
    if (modalInteraction.customId !== 'guess_modal') return;

    const inputValue = modalInteraction.fields.getTextInputValue('guess_number');
    const guess = parseInt(inputValue);

    if (isNaN(guess) || guess < 1 || guess > 10) {
      return modalInteraction.reply({
        content: '❌ That’s not a valid number between 1 and 10!',
        ephemeral: true
      });
    }

    if (guess === targetNumber) {
      await modalInteraction.update({
        content: `🎉 GG! You guessed it! The number was **${targetNumber}**.`,
        embeds: [],
        components: []
      });
      collector.stop();
      modalCollector.stop();
    } else {
      await modalInteraction.reply({
        content: `❌ Nope! ${guess} is not it. Try again with the button.`,
        ephemeral: true
      });
    }
  });

  collector.on('end', async () => {
    try {
      await interaction.editReply({
        components: []
      });
    } catch (e) {
      // Ignore if already updated
    }
  });
}
