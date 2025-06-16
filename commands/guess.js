import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

const games = new Map(); // Map userId -> secretNumber

export const data = new SlashCommandBuilder()
  .setName('guess')
  .setDescription('Play the number guessing game')
  .addIntegerOption(option => 
    option.setName('number')
      .setDescription('Your guess (1-100)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100));

export async function execute(interaction) {
  const userId = interaction.user.id;
  const guess = interaction.options.getInteger('number');

  // If no game for user, start new game:
  if (!games.has(userId)) {
    const secretNumber = Math.floor(Math.random() * 100) + 1;
    games.set(userId, secretNumber);
  }
  const secretNumber = games.get(userId);

  // Check the guess
  if (guess === secretNumber) {
    // Correct guess — end game, offer Play Again button
    games.delete(userId);

    // Create Play Again button
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('play_again')
        .setLabel('Play Again')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      content: `🎉 You guessed it! The number was **${secretNumber}**.`,
      components: [row],
      flags: 64, // ephemeral
    });

    // Create a button collector for this interaction message and user
    const filter = i => i.user.id === userId && i.customId === 'play_again';
    const collector = interaction.channel.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async i => {
      if (i.customId === 'play_again') {
        // Start a new game for this user
        const newSecret = Math.floor(Math.random() * 100) + 1;
        games.set(userId, newSecret);

        // Reply to button interaction and remove the button
        await i.update({
          content: `🔢 New game started! Guess a number between 1 and 100 using /guess command.`,
          components: []
        });
      }
    });

    collector.on('end', async collected => {
      // Disable the button after collector expires
      if (!interaction.replied) return; // safety check
      const message = await interaction.fetchReply();
      if (!message) return;

      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('play_again')
          .setLabel('Play Again')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true)
      );

      await message.edit({ components: [disabledRow] }).catch(() => {});
    });

  } else if (guess > secretNumber) {
    await interaction.reply({ content: `⬇️ ${guess} is too high! Try a lower number.`, flags: 64 });
  } else {
    await interaction.reply({ content: `⬆️ ${guess} is too low! Try a higher number.`, flags: 64 });
  }
}
