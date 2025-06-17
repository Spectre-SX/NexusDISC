import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ComponentType } from 'discord.js';

const flags = {
  easy: [
    { country: 'France', emoji: '🇫🇷' },
    { country: 'Germany', emoji: '🇩🇪' },
    { country: 'United States', emoji: '🇺🇸' },
    { country: 'United Kingdom', emoji: '🇬🇧' },
    { country: 'Canada', emoji: '🇨🇦' },
  ],
  medium: [
    { country: 'Argentina', emoji: '🇦🇷' },
    { country: 'South Korea', emoji: '🇰🇷' },
    { country: 'Portugal', emoji: '🇵🇹' },
    { country: 'Thailand', emoji: '🇹🇭' },
    { country: 'Ukraine', emoji: '🇺🇦' },
  ],
  hard: [
    { country: 'Albania', emoji: '🇦🇱' },
    { country: 'Monaco', emoji: '🇲🇨' },
    { country: 'Montenegro', emoji: '🇲🇪' },
    { country: 'Estonia', emoji: '🇪🇪' },
    { country: 'Moldova', emoji: '🇲🇩' },
  ],
  impossible: [
    { country: 'Eswatini', emoji: '🇸🇿' },
    { country: 'Bhutan', emoji: '🇧🇹' },
    { country: 'Vanuatu', emoji: '🇻🇺' },
    { country: 'Kiribati', emoji: '🇰🇮' },
    { country: 'Comoros', emoji: '🇰🇲' },
  ]
};

export const data = new SlashCommandBuilder()
  .setName('flag')
  .setDescription('Start a flag guessing game');

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🚩 Flag Guessing Game')
    .setDescription('Choose your difficulty to begin.\nYou will get 3 rounds to guess the correct flag.')
    .setColor('Blue');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('flag_easy').setLabel('Easy').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('flag_medium').setLabel('Medium').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('flag_hard').setLabel('Hard').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('flag_impossible').setLabel('Impossible').setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({ embeds: [embed], components: [row] });

  const collector = interaction.channel.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 15000
  });

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id)
      return i.reply({ content: '❌ This game isn’t for you!', ephemeral: true });

    const diff = i.customId.split('_')[1];
    const pool = [...flags[diff]];
    let score = 0;
    let round = 0;

    await i.deferUpdate(); // Avoid interaction failed
    await i.editReply({ components: [], embeds: [] });

    const runRound = async () => {
      if (round >= 3) {
        return interaction.followUp({
          content: `🏁 Game over! You got **${score}/3** correct. 🎉`
        });
      }

      const index = Math.floor(Math.random() * pool.length);
      const correct = pool.splice(index, 1)[0];
      const options = [correct];

      while (options.length < 4) {
        const rand = flags[diff][Math.floor(Math.random() * flags[diff].length)];
        if (!options.some(opt => opt.country === rand.country)) options.push(rand);
      }

      options.sort(() => Math.random() - 0.5); // shuffle

      const embed = new EmbedBuilder()
        .setTitle(`Round ${round + 1}`)
        .setDescription(`Which country does this flag belong to?\n\n${correct.emoji}`)
        .setColor('Purple');

      const optionRow = new ActionRowBuilder().addComponents(
        options.map((opt, idx) =>
          new ButtonBuilder()
            .setCustomId(`guess_${opt.country}`)
            .setLabel(opt.country)
            .setStyle(ButtonStyle.Secondary)
        )
      );

      const msg = await interaction.followUp({ embeds: [embed], components: [optionRow], fetchReply: true });

      const buttonCollector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 15000,
        max: 1
      });

      buttonCollector.on('collect', async btn => {
        if (btn.user.id !== interaction.user.id)
          return btn.reply({ content: 'Not your turn!', ephemeral: true });

        const guessed = btn.customId.split('_')[1];

        await btn.deferUpdate();
        await btn.editReply({ components: [] });

        if (guessed === correct.country) {
          await interaction.followUp({ content: '✅ Correct!' });
          score++;
        } else {
          await interaction.followUp({ content: `❌ Nope! The correct answer was **${correct.country}**.` });
        }

        round++;
        setTimeout(runRound, 1000); // wait before next round
      });
    };

    runRound();
  });
}
