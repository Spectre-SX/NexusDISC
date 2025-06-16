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
  Events
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
    time: 60000
  });

  collector.on('collect', async (btn) => {
    if (btn.user.id !== interaction.user.id) {
      return btn.reply({ content: "Yo, this ain't your game 😤", ephemeral: true });
    }

    if (btn.customId === 'guess_giveup') {
      await btn.update({
        content: `😢 You gave up! The number was **${targetNumber}**.`,
        components: [],
        embeds: []
      });
      collector.stop();
      return;
    }

    if (btn.customId === 'guess_input') {
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

      await btn.showModal(modal);

      // Wait for the modal submission
      const modalInteraction = await btn.awaitModalSubmit({
        time: 30000,
        filter: i => i.user.id === btn.user.id && i.customId === 'guess_modal'
      }).catch(() => null);

      if (!modalInteraction) {
        return btn.followUp({ content: '⏱️ You didn’t respond in time!', ephemeral: true });
      }

      const guess = parseInt(modalInteraction.fields.getTextInputValue('guess_number'));

      if (isNaN(guess) || guess < 1 || guess > 10) {
        return modalInteraction.reply({ content: '⚠️ Invalid number! Enter a number from 1 to 10.', ephemeral: true });
      }

      if (guess === targetNumber) {
        await modalInteraction.update({
          content: `🎉 GG! You guessed it right. The number was **${targetNumber}**!`,
          components: [],
          embeds: []
        });
        collector.stop();
      } else {
        await modalInteraction.reply({
          content: `❌ Nope! ${guess} ain't it. Try again with the button.`,
          ephemeral: true
        });
      }
    }
  });

  collector.on('end', async () => {
    try {
      await interaction.editReply({
        components: []
      });
    } catch (err) {
      // ignore if already updated
    }
  });
}
