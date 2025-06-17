import Discord from 'discord.js';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  entersState,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import ytdl from 'ytdl-core';
import ytSearch from 'yt-search';

const { SlashCommandBuilder } = Discord;

const queue = new Map();

export default {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('Play music from YouTube')
    .addStringOption(option =>
      option.setName('query').setDescription('Song name or URL').setRequired(true)
    ),

  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel)
      return interaction.reply('You need to be in a voice channel to play music! 🎧');

    const permissions = voiceChannel.permissionsFor(interaction.client.user);
    if (!permissions.has('Connect') || !permissions.has('Speak'))
      return interaction.reply('I need permissions to join and speak in your voice channel! 🔊');

    const query = interaction.options.getString('query');

    let serverQueue = queue.get(interaction.guild.id);

    const songInfo = await getSongInfo(query);
    if (!songInfo) return interaction.reply('No results found for that song! 😕');

    const song = {
      title: songInfo.title,
      url: songInfo.video_url,
    };

    if (!serverQueue) {
      const queueContruct = {
        textChannel: interaction.channel,
        voiceChannel: voiceChannel,
        connection: null,
        player: null,
        songs: [],
        playing: true,
      };

      queue.set(interaction.guild.id, queueContruct);

      queueContruct.songs.push(song);

      try {
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: interaction.guild.id,
          adapterCreator: interaction.guild.voiceAdapterCreator,
        });
        queueContruct.connection = connection;
        queueContruct.player = createAudioPlayer();

        connection.subscribe(queueContruct.player);

        playSong(interaction.guild, queueContruct.songs[0]);

        interaction.reply(`🎶 Now playing: **${song.title}**`);
      } catch (err) {
        console.error(err);
        queue.delete(interaction.guild.id);
        return interaction.reply('Error connecting to the voice channel! ❌');
      }
    } else {
      serverQueue.songs.push(song);
      return interaction.reply(`✅ **${song.title}** has been added to the queue!`);
    }
  },
};

async function getSongInfo(query) {
  if (ytdl.validateURL(query)) {
    // If it's a URL, get info directly
    const info = await ytdl.getInfo(query);
    return info.videoDetails;
  } else {
    // Else, search YouTube
    const result = await ytSearch(query);
    if (result && result.videos.length > 0) return result.videos[0];
    else return null;
  }
}

async function playSong(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.voiceChannel.leave?.(); // Leave voice channel if no song
    queue.delete(guild.id);
    return;
  }

  const stream = ytdl(song.url, {
    filter: 'audioonly',
    quality: 'highestaudio',
    highWaterMark: 1 << 25, // big buffer for smoother playback
  });

  const resource = createAudioResource(stream);

  serverQueue.player.play(resource);

  serverQueue.player.once(AudioPlayerStatus.Idle, () => {
    serverQueue.songs.shift();
    playSong(guild, serverQueue.songs[0]);
  });

  serverQueue.player.once('error', error => {
    console.error(`Error: ${error.message} with resource ${song.title}`);
    serverQueue.songs.shift();
    playSong(guild, serverQueue.songs[0]);
  });
}
