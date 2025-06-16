import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

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
      active: true,
    };
    await interaction.reply({
      content: `🎲 New game started! Try to guess the number between 1 and 100.`,
      ephemeral: true,
    });
    return;
  }

  const game = games[userId];

  if (!game.active) {
    return interaction.reply({ content: "You don't have an active game! Click the **Play Again** button to start a new game.", ephemeral: true });
  }

  game.attempts++;

  if (guess === game.target) {
    game.active = false; // mark game as ended

    // Create "Play Again" button
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('play_again')
        .setLabel('Play Again')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      content: `🎉 Congrats! You guessed the number **${game.target}** in ${game.attempts} attempts!`,
      components: [row],
      ephemeral: true,
    });

    // Create a collector to listen for button click
    const message = await interaction.fetchReply();

    const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async i => {
      if (i.user.id !== userId) {
        return i.reply({ content: "This button isn't for you!", ephemeral: true });
      }

      if (i.customId === 'play_again') {
        games[userId] = {
          target: Math.floor(Math.random() * 100) + 1,
          attempts: 0,
          active: true,
        };
        await i.update({ content: '🎲 New game started! Guess a number between 1 and 100.', components: [] });
        collector.stop();
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        // Disable button after timeout
        interaction.editReply({
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('play_again')
                .setLabel('Play Again')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true)
            ),
          ],
        });
      }
    });

  } else if (guess < game.target) {
    await interaction.reply({ content: `⬇️ ${guess} is too low! Try a higher number.`, ephemeral: true });
  } else {
    await interaction.reply({ content: `⬇️ ${guess} is too high! Try a lower number.`, ephemeral: true });
  }
}
