import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';

const countries = {
  easy: [
    { name: 'United States', code: 'us' },
    { name: 'United Kingdom', code: 'gb' },
    { name: 'France', code: 'fr' },
    { name: 'Germany', code: 'de' },
    { name: 'Canada', code: 'ca' },
    { name: 'Japan', code: 'jp' },
    { name: 'Italy', code: 'it' },
    { name: 'Brazil', code: 'br' },
    { name: 'Australia', code: 'au' },
    { name: 'Spain', code: 'es' },
  ],
  medium: [
    { name: 'Thailand', code: 'th' },
    { name: 'Chile', code: 'cl' },
    { name: 'Greece', code: 'gr' },
    { name: 'Poland', code: 'pl' },
    { name: 'Sweden', code: 'se' },
    { name: 'Argentina', code: 'ar' },
    { name: 'Vietnam', code: 'vn' },
    { name: 'Colombia', code: 'co' },
    { name: 'Norway', code: 'no' },
    { name: 'Portugal', code: 'pt' },
  ],
  hard: [
    { name: 'Albania', code: 'al' },
    { name: 'Monaco', code: 'mc' },
    { name: 'Montenegro', code: 'me' },
    { name: 'Moldova', code: 'md' },
    { name: 'Liechtenstein', code: 'li' },
    { name: 'Malta', code: 'mt' },
    { name: 'Andorra', code: 'ad' },
    { name: 'Luxembourg', code: 'lu' },
    { name: 'San Marino', code: 'sm' },
    { name: 'Iceland', code: 'is' },
  ],
  impossible: [
    { name: 'Bhutan', code: 'bt' },
    { name: 'Kiribati', code: 'ki' },
    { name: 'Comoros', code: 'km' },
    { name: 'Nauru', code: 'nr' },
    { name: 'Tuvalu', code: 'tv' },
    { name: 'São Tomé and Príncipe', code: 'st' },
    { name: 'Togo', code: 'tg' },
    { name: 'Vanuatu', code: 'vu' },
    { name: 'Palau', code: 'pw' },
    { name: 'Lesotho', code: 'ls' },
  ],
};

// Helper to get random country from difficulty pool
function getRandomCountry(difficulty) {
  const pool = countries[difficulty];
  return pool[Math.floor(Math.random() * pool.length)];
}

const roundsPerGame = 3;

export default {
  data: new SlashCommandBuilder()
    .setName('flag')
    .setDescription('Play the flag guessing game')
    .addSubcommand(sub =>
      sub
        .setName('game')
        .setDescription('Start a flag guessing game'),
    ),

  async execute(interaction, client) {
    if (interaction.options.getSubcommand() === 'game') {
      const embed = new EmbedBuilder()
        .setTitle('Flag Guessing Game 🎌')
        .setDescription(
          `Choose your difficulty and guess the country name based on the flag! You get ${roundsPerGame} rounds.\n\nClick a difficulty below to start!`
        )
        .setColor('Random');

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('flag_easy')
          .setLabel('Easy')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('flag_medium')
          .setLabel('Medium')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('flag_hard')
          .setLabel('Hard')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('flag_impossible')
          .setLabel('Impossible')
          .setStyle(ButtonStyle.Secondary),
      );

      await interaction.reply({ embeds: [embed], components: [buttons] });

      const filter = i => i.user.id === interaction.user.id && i.customId.startsWith('flag_');
      const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000, max: 1 });

      collector.on('collect', async i => {
        await i.deferUpdate();

        const difficulty = i.customId.split('_')[1];

        let score = 0;
        let currentRound = 0;

        async function playRound() {
          currentRound++;
          if (currentRound > roundsPerGame) {
            return i.followUp({
              content: `Game over! Your score: **${score} / ${roundsPerGame}**`,
              ephemeral: true,
            });
          }

          const country = getRandomCountry(difficulty);
          const flagUrl = `https://flagcdn.com/w256/${country.code}.png`;

          const roundEmbed = new EmbedBuilder()
            .setTitle(`Round ${currentRound} - Difficulty: ${difficulty[0].toUpperCase() + difficulty.slice(1)}`)
            .setDescription('Guess the country name for this flag! Type your answer in chat.')
            .setImage(flagUrl)
            .setColor('Random');

          await i.followUp({ embeds: [roundEmbed], ephemeral: true });

          // Wait for the user's message guess
          const messageFilter = m => m.author.id === interaction.user.id;
          const collected = await interaction.channel.awaitMessages({ filter: messageFilter, max: 1, time: 30000, errors: ['time'] }).catch(() => null);

          if (!collected) {
            await i.followUp({ content: 'Time is up! Moving to next round...', ephemeral: true });
            return playRound();
          }

          const guess = collected.first().content.toLowerCase().trim();
          const answer = country.name.toLowerCase();

          if (guess === answer) {
            score++;
            await i.followUp({ content: `✅ Correct! The answer was **${country.name}**.`, ephemeral: true });
          } else {
            await i.followUp({ content: `❌ Wrong! The answer was **${country.name}**.`, ephemeral: true });
          }

          playRound();
        }

        playRound();
      });

      collector.on('end', collected => {
        if (collected.size === 0) {
          interaction.editReply({ content: 'No difficulty selected, game cancelled.', components: [] });
        }
      });
    }
  },
};
