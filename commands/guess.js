import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ComponentType } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('guess')
  .setDescription('Guess a number between 1 and 10!');

export async function execute(interaction) {
  const targetNumber = Math.floor(Math.random() * 10) + 1;

  const embed = new EmbedBuilder()
    .setTitle('🎲 Guessing Game')
    .setDescription('I picked a number between **1** and **10**. Can you guess it?\nClick **Keep Going!** to try, or **Give Up** if you’re done.')
    .setColor(0x5865F2);

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('guess_keepgoing')
      .setLabel('Keep Going!')
      .setStyle(ButtonStyle.Success),
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

  const collector = interaction.channel.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60_000 // 1 min timeout
  });

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id)
      return i.reply({ content: 'Bro chill, this isn’t your game 😤', ephemeral: true });

    if (i.customId === 'guess_giveup') {
      await i.update({
        content: `😔 You gave up! The number was **${targetNumber}**.`,
        embeds: [],
        components: []
      });
      collector.stop();
      return;
    }

    const guessed = Math.floor(Math.random() * 10) + 1;

    if (guessed === targetNumber) {
      await i.update({
        content: `🎉 You guessed it! The number was **${targetNumber}**!`,
        embeds: [],
        components: []
      });
      collector.stop();
    } else {
      await i.reply({ content: `❌ Nope, it was **${guessed}**. Try again!`, ephemeral: true });
    }
  });

  collector.on('end', async () => {
    if (!interaction.replied) return;
    try {
      await interaction.editReply({
        content: '⏱️ Time’s up!',
        components: []
      });
    } catch (e) {
      // if interaction already updated, skip
    }
  });
}
