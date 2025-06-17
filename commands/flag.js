import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ComponentType,
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('flag')
  .setDescription('Start a flag guessing game')
  .addSubcommand(sub =>
    sub.setName('start').setDescription('Start the game')
  );

export async function execute(interaction) {
  if (!interaction.options.getSubcommand || interaction.options.getSubcommand() !== 'start') return;

  const difficulties = {
    easy: [
      { url: 'https://flagcdn.com/w320/us.png', answer: 'United States' },
      { url: 'https://flagcdn.com/w320/fr.png', answer: 'France' },
      { url: 'https://flagcdn.com/w320/jp.png', answer: 'Japan' },
      { url: 'https://flagcdn.com/w320/de.png', answer: 'Germany' },
      { url: 'https://flagcdn.com/w320/gb.png', answer: 'United Kingdom' },
    ],
    medium: [
      { url: 'https://flagcdn.com/w320/in.png', answer: 'India' },
      { url: 'https://flagcdn.com/w320/ca.png', answer: 'Canada' },
      { url: 'https://flagcdn.com/w320/za.png', answer: 'South Africa' },
      { url: 'https://flagcdn.com/w320/no.png', answer: 'Norway' },
      { url: 'https://flagcdn.com/w320/br.png', answer: 'Brazil' },
    ],
    hard: [
      { url: 'https://flagcdn.com/w320/al.png', answer: 'Albania' },
      { url: 'https://flagcdn.com/w320/mc.png', answer: 'Monaco' },
      { url: 'https://flagcdn.com/w320/me.png', answer: 'Montenegro' },
      { url: 'https://flagcdn.com/w320/mn.png', answer: 'Mongolia' },
      { url: 'https://flagcdn.com/w320/md.png', answer: 'Moldova' },
    ],
    impossible: [
      { url: 'https://flagcdn.com/w320/sz.png', answer: 'Eswatini' },
      { url: 'https://flagcdn.com/w320/vu.png', answer: 'Vanuatu' },
      { url: 'https://flagcdn.com/w320/km.png', answer: 'Comoros' },
      { url: 'https://flagcdn.com/w320/tl.png', answer: 'Timor-Leste' },
      { url: 'https://flagcdn.com/w320/gq.png', answer: 'Equatorial Guinea' },
    ]
  };

  const menuEmbed = new EmbedBuilder()
    .setTitle('🌍 Flag Guessing Game')
    .setDescription('Choose a difficulty to start. You’ll get 3 flags to guess!')
    .setColor('Random');

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('flag_easy')
      .setLabel('🟢 Easy')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('flag_medium')
      .setLabel('🟠 Medium')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('flag_hard')
      .setLabel('🔴 Hard')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('flag_impossible')
      .setLabel('⚫ Impossible')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({ embeds: [menuEmbed], components: [buttons] });

  const msg = await interaction.fetchReply();

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 15000,
  });

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id)
      return i.reply({ content: 'This isn’t your game 😅', ephemeral: true });

    const diff = i.customId.split('_')[1];
    const pool = [...difficulties[diff]];
    let score = 0;
    let round = 0;

    const runRound = async () => {
      if (round >= 3) {
        return i.followUp({
          content: `🏁 Game over! You got **${score} out of 3** correct.`,
        });
      }

      const index = Math.floor(Math.random() * pool.length);
      const flag = pool.splice(index, 1)[0]; // remove used flag
      round++;

      const flagEmbed = new EmbedBuilder()
        .setTitle(`Round ${round}/3`)
        .setDescription('Guess the country this flag belongs to:')
        .setImage(flag.url)
        .setColor('Blue');

      await i.followUp({ embeds: [flagEmbed] });

      const msgFilter = m => m.author.id === i.user.id;
      const answerCollector = i.channel.createMessageCollector({
        filter: msgFilter,
        time: 15000,
        max: 1
      });

      answerCollector.on('collect', async m => {
        if (m.content.trim().toLowerCase() === flag.answer.toLowerCase()) {
          await m.reply('✅ Correct!');
          score++;
        } else {
          await m.reply(`❌ Nope! The correct answer was **${flag.answer}**`);
        }
        runRound(); // next round
      });

      answerCollector.on('end', collected => {
        if (collected.size === 0) {
          i.followUp({
            content: `⏱️ Time’s up! The answer was **${flag.answer}**.`,
          });
          runRound(); // next round
        }
      });
    };

    await i.update({ components: [], embeds: [] }); // remove menu
    runRound(); // start 1st round
  });

  collector.on('end', collected => {
    if (collected.size === 0) {
      interaction.editReply({
        content: '⏱️ You didn’t pick a difficulty in time.',
        components: [],
        embeds: []
      });
    }
  });
}
