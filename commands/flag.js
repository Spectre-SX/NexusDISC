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
    .setDescription('Can you guess the country from its flag?\nChoose a difficulty to begin:')
    .setColor('Random')
    .setFooter({ text: 'Try impossible if you dare 🧠💀' });

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
    const pool = difficulties[diff];
    const selected = pool[Math.floor(Math.random() * pool.length)];

    const flagEmbed = new EmbedBuilder()
      .setTitle('🧠 Guess the Flag!')
      .setDescription('Which country is this flag from?\nType your answer below!')
      .setImage(selected.url)
      .setColor('Blue');

    await i.update({ embeds: [flagEmbed], components: [] });

    const filter = m => m.author.id === i.user.id;
    const guessCollector = i.channel.createMessageCollector({ filter, time: 15000, max: 1 });

    guessCollector.on('collect', async m => {
      const guess = m.content.trim().toLowerCase();
      if (guess === selected.answer.toLowerCase()) {
        await m.reply('✅ Correct! Big brain energy 💪');
      } else {
        await m.reply(`❌ Wrong! It was **${selected.answer}** 😬`);
      }
    });

    guessCollector.on('end', async collected => {
      if (collected.size === 0) {
        await i.followUp({
          content: `⌛ Time’s up! The answer was **${selected.answer}**.`,
          ephemeral: true
        });
      }
    });
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
