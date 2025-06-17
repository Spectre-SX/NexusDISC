import {
  SlashCommandBuilder,
} from 'discord.js';

import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
} from '@discordjs/voice';

import ytdl from 'ytdl-core';

const queue = new Map();

export default {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('Music commands: play, pause, resume, skip')
    .addSubcommand(sub =>
      sub.setName('play')
        .setDescription('Play a song from YouTube URL')
        .addStringOption(option =>
          option.setName('url')
            .setDescription('YouTube URL')
            .setRequired(true)
        ))
    .addSubcommand(sub => sub.setName('pause').setDescription('Pause the music'))
    .addSubcommand(sub => sub.setName('resume').setDescription('Resume the music'))
    .addSubcommand(sub => sub.setName('skip').setDescription('Skip current song')),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({ content: '❌ You need to be in a voice channel to use music commands!', ephemeral: true });
    }

    const serverQueue = queue.get(interaction.guild.id);

    if (subcommand === 'play') {
      const url = interaction.options.getString('url');

      if (!ytdl.validateURL(url)) {
        return interaction.reply({ content: '❌ Please provide a valid YouTube URL.', ephemeral: true });
      }

      if (!serverQueue) {
        // Create queue structure
        const queueContruct = {
          voiceChannel,
          connection: null,
          player: null,
          songs: [],
          playing: true,
        };

        queue.set(interaction.guild.id, queueContruct);

        queueContruct.songs.push({ url });

        try {
          // Join voice channel
          const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
          });
          queueContruct.connection = connection;

          // Create audio player
          const player = createAudioPlayer({
            behaviors: {
              noSubscriber: NoSubscriberBehavior.Pause,
            },
          });
          queueContruct.player = player;

          connection.subscribe(player);

          playSong(interaction.guild, queueContruct.songs[0]);

          return interaction.reply({ content: `🎶 Playing your song!`, ephemeral: true });
        } catch (error) {
          console.error(error);
          queue.delete(interaction.guild.id);
          return interaction.reply({ content: '❌ Error connecting to the voice channel.', ephemeral: true });
        }
      } else {
        serverQueue.songs.push({ url });
        return interaction.reply({ content: `✅ Song added to the queue! Position: ${serverQueue.songs.length}`, ephemeral: true });
      }
    } else if (subcommand === 'pause') {
      if (!serverQueue || !serverQueue.player) {
        return interaction.reply({ content: '❌ Nothing is playing right now.', ephemeral: true });
      }
      serverQueue.player.pause();
      return interaction.reply({ content: '⏸️ Music paused.', ephemeral: true });
    } else if (subcommand === 'resume') {
      if (!serverQueue || !serverQueue.player) {
        return interaction.reply({ content: '❌ Nothing is playing right now.', ephemeral: true });
      }
      serverQueue.player.unpause();
      return interaction.reply({ content: '▶️ Music resumed.', ephemeral: true });
    } else if (subcommand === 'skip') {
      if (!serverQueue || !serverQueue.player) {
        return interaction.reply({ content: '❌ Nothing is playing right now.', ephemeral: true });
      }
      if (serverQueue.songs.length > 1) {
        serverQueue.songs.shift();
        playSong(interaction.guild, serverQueue.songs[0]);
        return interaction.reply({ content: '⏭️ Skipped to next song.', ephemeral: true });
      } else {
        serverQueue.player.stop();
        queue.delete(interaction.guild.id);
        return interaction.reply({ content: '🛑 No more songs in queue, leaving the voice channel.', ephemeral: true });
      }
    }
  },
};

function playSong(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.connection.destroy();
    queue.delete(guild.id);
    return;
  }

  const stream = ytdl(song.url, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });
  const resource = createAudioResource(stream);

  serverQueue.player.play(resource);

  serverQueue.player.once(AudioPlayerStatus.Idle, () => {
    serverQueue.songs.shift();
    playSong(guild, serverQueue.songs[0]);
  });
}
