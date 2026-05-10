const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  AttachmentBuilder,
} = require('discord.js');
const fs   = require('fs');
const path = require('path');
require('dotenv').config();

// ─── Client ───────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// ─── Config ───────────────────────────────────────────────────────────────────
const PREFIX = ',';

// From .env (already set by user)
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID;
const GOODBYE_CHANNEL_ID = process.env.GOODBYE_CHANNEL_ID;
const RULES_CHANNEL_ID   = process.env.RULES_CHANNEL_ID;
const TICKETS_CHANNEL_ID = process.env.TICKETS_CHANNEL_ID;
const TICKET_CATEGORY_ID = process.env.TICKET_CATEGORY_ID;
const MOD_ROLE_ID        = process.env.MOD_ROLE_ID;
const COOWNER_ROLE_ID    = process.env.COOWNER_ROLE_ID;
const OWNER_ROLE_ID      = process.env.OWNER_ROLE_ID;

// Hardcoded (provided by user)
const AUTO_ROLE_ID           = '1497982689322733701';
const SUGGESTIONS_CHANNEL_ID = '1503081779571986614';
const ALERT_CHANNEL_ID       = '1486680372560527503';
const LOG_CHANNEL_ID         = '1503042913867792476';
const ANNOUNCE_CHANNEL_ID    = '1486682318822178906';
const BUMP_CHANNEL_ID        = '1486680372560527500';

const STAFF_ROLE_IDS  = [MOD_ROLE_ID, COOWNER_ROLE_ID, OWNER_ROLE_ID].filter(Boolean);
const RULES_IMAGE_URL = 'https://i.pinimg.com/originals/ee/87/e1/ee87e12dc91f23b572cd566efc7f3137.gif';
const SERVER_NAME     = '/unsocial';
const SERVER_DESC     = 'we are a **sfw** server based on **socialising**, offering **active & friendly chats** ♡';

const RULES = [
  { title: 'be respectful',      desc: 'treat everyone with kindness. no bullying, harassment, or hate speech.' },
  { title: 'no spam',            desc: 'keep messages meaningful. no repeated messages or excessive caps.' },
  { title: 'sfw only',           desc: 'this is a strictly sfw server. nsfw content will result in an instant ban.' },
  { title: 'no advertising',     desc: 'do not dm members or post unsolicited server invites.' },
  { title: 'follow discord tos', desc: 'discord.com/terms — violations will be reported and result in a ban.' },
  { title: 'listen to staff',    desc: 'moderator decisions are final. dm staff if you have concerns.' },
];

const TICKET_TYPES = {
  support:    { label: 'Support',       emoji: '🎀' },
  report:     { label: 'Report a User', emoji: '⚠️' },
  ban_appeal: { label: 'Ban Appeal',    emoji: '📋' },
};

// ─── Data Storage ─────────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

function loadData(file) {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) fs.writeFileSync(p, '{}');
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
}
function saveData(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

let xpData       = loadData('xp.json');
let warningData  = loadData('warnings.json');
let reminderData = loadData('reminders.json');

// ─── XP System ────────────────────────────────────────────────────────────────
const xpCooldowns = new Map();
const XP_PER_MSG  = 15;
const XP_COOLDOWN = 60000;

function getXP(guildId, userId) {
  if (!xpData[guildId]) xpData[guildId] = {};
  if (!xpData[guildId][userId]) xpData[guildId][userId] = { xp: 0, level: 0 };
  return xpData[guildId][userId];
}
function xpForLevel(level) { return 100 * level * (level + 1) + 100; }
function addXP(guildId, userId) {
  const data   = getXP(guildId, userId);
  data.xp     += XP_PER_MSG;
  const needed = xpForLevel(data.level + 1);
  let leveledUp = false;
  if (data.xp >= needed) { data.level++; data.xp -= needed; leveledUp = true; }
  xpData[guildId][userId] = data;
  saveData('xp.json', xpData);
  return { ...data, leveledUp };
}

// ─── Warnings ─────────────────────────────────────────────────────────────────
function getWarnings(guildId, userId) {
  if (!warningData[guildId]) warningData[guildId] = {};
  if (!warningData[guildId][userId]) warningData[guildId][userId] = [];
  return warningData[guildId][userId];
}
function addWarning(guildId, userId, reason, moderator) {
  if (!warningData[guildId]) warningData[guildId] = {};
  if (!warningData[guildId][userId]) warningData[guildId][userId] = [];
  warningData[guildId][userId].push({ reason, moderator, date: new Date().toISOString() });
  saveData('warnings.json', warningData);
  return warningData[guildId][userId].length;
}
function clearWarnings(guildId, userId) {
  if (warningData[guildId]) warningData[guildId][userId] = [];
  saveData('warnings.json', warningData);
}

// ─── Reminders ────────────────────────────────────────────────────────────────
function parseTime(str) {
  const m = str.match(/^(\d+)(s|m|h|d)$/);
  if (!m) return null;
  return parseInt(m[1]) * { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2]];
}

setInterval(async () => {
  const now = Date.now();
  let changed = false;
  for (const userId in reminderData) {
    const before = reminderData[userId].length;
    reminderData[userId] = reminderData[userId].filter(r => {
      if (now >= r.time) {
        client.users.fetch(userId).then(u => u.send({
          embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle('⏰ reminder!').setDescription(r.message).setFooter({ text: `${SERVER_NAME} ♡` }).setTimestamp()],
        })).catch(() => {});
        return false;
      }
      return true;
    });
    if (reminderData[userId].length !== before) changed = true;
  }
  if (changed) saveData('reminders.json', reminderData);
}, 30000);

// ─── Anti-spam ────────────────────────────────────────────────────────────────
const spamMap       = new Map();
const SPAM_LIMIT    = 8;
const SPAM_INTERVAL = 5000;

async function checkSpam(message) {
  const uid = message.author.id;
  if (!spamMap.has(uid)) {
    spamMap.set(uid, { count: 1, timer: setTimeout(() => spamMap.delete(uid), SPAM_INTERVAL) });
    return false;
  }
  const d = spamMap.get(uid);
  d.count++;
  if (d.count >= SPAM_LIMIT) {
    clearTimeout(d.timer);
    spamMap.delete(uid);
    await message.member.timeout(5 * 60 * 1000, 'Auto-mod: spam').catch(() => {});
    message.channel.send({
      embeds: [new EmbedBuilder().setColor(0xED4245).setDescription(`🔇 ${message.author} muted for **5 minutes** for spamming.`).setTimestamp()],
    });
    logToChannel(message.guild, new EmbedBuilder().setColor(0xED4245).setTitle('🔇 Auto-Mod: Spam')
      .addFields({ name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true }, { name: 'Channel', value: `<#${message.channel.id}>`, inline: true })
      .setTimestamp());
    return true;
  }
  return false;
}

// ─── Anti-raid ────────────────────────────────────────────────────────────────
const recentJoins    = [];
const RAID_THRESHOLD = 5;
const RAID_INTERVAL  = 10000;

async function checkRaid(member) {
  const now = Date.now();
  recentJoins.push({ id: member.id, tag: member.user.tag, time: now });
  const window = recentJoins.filter(j => now - j.time < RAID_INTERVAL);
  recentJoins.length = 0;
  recentJoins.push(...window);
  if (window.length < RAID_THRESHOLD) return;

  const guild  = member.guild;
  const raiders = [...window];

  // Lock all channels
  const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
  for (const [, ch] of textChannels) {
    await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }).catch(() => {});
  }

  // Public humiliation embed
  const raiderList = raiders.map(r => `• **${r.tag}** (<@${r.id}>)`).join('\n');
  const humilEmbed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle('🚨 RAID DETECTED & NEUTRALIZED')
    .setDescription(
      `an attempted raid by **${raiders.length}** accounts has been stopped.\n\n` +
      `the following losers tried to raid **${SERVER_NAME}** and got instantly banned:\n\n` +
      `${raiderList}\n\n` +
      `better luck next time 💀\n\n` +
      `*server is now in lockdown — use \`,unlockdown\` to restore.*`
    )
    .setTimestamp();

  const alertCh = guild.channels.cache.get(ALERT_CHANNEL_ID);
  if (alertCh) await alertCh.send({ embeds: [humilEmbed] });

  // Ban all raiders
  for (const r of raiders) {
    await guild.members.ban(r.id, { reason: 'Auto-mod: raid detected' }).catch(() => {});
  }

  // DM owner
  const owner = await guild.fetchOwner().catch(() => null);
  if (owner) owner.send({
    embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('🚨 Raid Alert')
      .setDescription(`A raid was detected on **${guild.name}**. ${raiders.length} accounts were banned. Server is in lockdown — use \`,unlockdown\` to restore.`)
      .setTimestamp()],
  }).catch(() => {});

  recentJoins.length = 0;
}

// ─── Auto-mod helpers ─────────────────────────────────────────────────────────
// Catches nigger and all variants (n1gg3r, nigg@, n-i-g-g-e-r, caps, etc.)
function containsBlacklisted(text) {
  const clean = text.toLowerCase().replace(/[\s\-_.]+/g, '');
  return /n+[i!1|l]+[g9qc]+[g9qc]+[e3a@o0]+[rz]*/i.test(clean);
}

const INVITE_REGEX = /(discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/\S+/i;

// ─── Log helper ───────────────────────────────────────────────────────────────
async function logToChannel(guild, embed) {
  const ch = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (ch) ch.send({ embeds: [embed] });
}

// ─── Rules ────────────────────────────────────────────────────────────────────
async function buildRulesMessage() {
  const imageEmbed = new EmbedBuilder().setColor(0x2b2d31).setImage(RULES_IMAGE_URL);
  const introEmbed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle(`welcome to ${SERVER_NAME} ✦`)
    .setDescription(
      `${SERVER_DESC}\n\n` +
      `> acknowledge our server rules before\n> interacting in ${SERVER_NAME} 🎀\n\n` +
      `follow **[discord terms](https://discord.com/terms)** & **[guidelines](https://discord.com/guidelines)**\n` +
      `↳ this server follows discord guidelines!`
    );
  const rulesEmbed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setDescription(RULES.map((r, i) => `♡ **${i + 1}. ${r.title}**\n↳ ${r.desc}`).join('\n\n'))
    .setFooter({ text: 'done reading? check out #chat ♡' });
  return { embeds: [imageEmbed, introEmbed, rulesEmbed] };
}

async function postRules(guild) {
  const ch = guild.channels.cache.get(RULES_CHANNEL_ID);
  if (!ch) return console.warn('⚠️  RULES_CHANNEL_ID not found.');
  const old = (await ch.messages.fetch({ limit: 20 })).filter(m => m.author.id === client.user.id);
  if (old.size) await ch.bulkDelete(old).catch(() => {});
  await ch.send(await buildRulesMessage());
  console.log('✅ Rules posted.');
}

// ─── Ticket panel ─────────────────────────────────────────────────────────────
async function postTicketPanel(guild) {
  const ch = guild.channels.cache.get(TICKETS_CHANNEL_ID);
  if (!ch) return console.warn('⚠️  TICKETS_CHANNEL_ID not found.');
  const old = (await ch.messages.fetch({ limit: 20 })).filter(m => m.author.id === client.user.id);
  if (old.size) await ch.bulkDelete(old).catch(() => {});
  await ch.send({
    embeds: [
      new EmbedBuilder().setColor(0x2b2d31).setTitle(`${SERVER_NAME} — support ✦`)
        .setDescription(
          `need help or want to report something?\nclick a button below to open a ticket ♡\n\n` +
          `🎀 **support** — general help or questions\n` +
          `⚠️ **report a user** — report a rule-breaking member\n` +
          `📋 **ban appeal** — appeal a ban or punishment`
        ).setFooter({ text: 'please only open tickets for genuine issues ♡' }),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setEmoji('🎀').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ticket_report').setLabel('Report a User').setEmoji('⚠️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ticket_ban_appeal').setLabel('Ban Appeal').setEmoji('📋').setStyle(ButtonStyle.Secondary),
      ),
    ],
  });
  console.log('✅ Ticket panel posted.');
}

// ─── Create ticket ────────────────────────────────────────────────────────────
async function createTicket(interaction, type) {
  const guild  = interaction.guild;
  const member = interaction.member;
  const { label, emoji } = TICKET_TYPES[type];

  const existing = guild.channels.cache.find(
    c => c.name === `${type}-${member.user.username}` && c.topic?.includes(member.id)
  );
  if (existing) return interaction.reply({ content: `❌ You already have an open ticket: <#${existing.id}>`, ephemeral: true });

  const ticketChannel = await guild.channels.create({
    name: `${type}-${member.user.username}`,
    type: ChannelType.GuildText,
    parent: TICKET_CATEGORY_ID || null,
    topic: `Ticket by ${member.user.tag} (${member.id}) | Type: ${label}`,
    permissionOverwrites: [
      { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
      { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      ...STAFF_ROLE_IDS.map(id => ({
        id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
      })),
    ],
  });

  const staffPings = STAFF_ROLE_IDS.map(id => `<@&${id}>`).join(' ');
  await ticketChannel.send({
    content: `${member} ${staffPings}`,
    embeds: [
      new EmbedBuilder().setColor(0x2b2d31).setTitle(`${emoji} ${label} ticket`)
        .setDescription(
          `hey ${member}, thanks for reaching out ♡\n\n` +
          `please describe your issue and staff will be with you shortly.\n\n` +
          `> **ticket type:** ${label}\n> **opened by:** ${member.user.tag}`
        ).setFooter({ text: `${SERVER_NAME} support` }).setTimestamp(),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_close').setLabel('Close Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger),
      ),
    ],
  });

  await interaction.reply({ content: `✅ Ticket opened: <#${ticketChannel.id}>`, ephemeral: true });
}

// ─── Close ticket ─────────────────────────────────────────────────────────────
async function closeTicket(interaction) {
  const channel = interaction.channel;
  const isMod   = interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers);
  const isOwner = channel.topic?.includes(interaction.user.id);
  if (!isMod && !isOwner) return interaction.reply({ content: '❌ Only staff or the ticket owner can close this.', ephemeral: true });

  await interaction.reply({
    embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('🔒 closing ticket — saving transcript and deleting in 10 seconds.').setTimestamp()],
  });

  // Build transcript
  const messages    = await channel.messages.fetch({ limit: 100 });
  const transcript  = [...messages.values()].reverse()
    .map(m => `[${new Date(m.createdTimestamp).toLocaleString()}] ${m.author.tag}: ${m.content || '[embed/attachment]'}`)
    .join('\n');
  const attachment = new AttachmentBuilder(Buffer.from(transcript, 'utf8'), { name: `transcript-${channel.name}.txt` });

  const logCh = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (logCh) logCh.send({
    embeds: [
      new EmbedBuilder().setColor(0xED4245).setTitle('🔒 Ticket Closed')
        .addFields(
          { name: 'Channel',   value: channel.name,         inline: true },
          { name: 'Closed by', value: interaction.user.tag, inline: true },
          { name: 'Topic',     value: channel.topic || 'N/A' },
        ).setTimestamp(),
    ],
    files: [attachment],
  });

  setTimeout(() => channel.delete().catch(() => {}), 10000);
}

// ─── Ready ────────────────────────────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity(`${SERVER_NAME} | ,help`);
  for (const guild of client.guilds.cache.values()) {
    await postRules(guild).catch(console.error);
    await postTicketPanel(guild).catch(console.error);
  }
});

// Bump reminder every 2 hours
setInterval(() => {
  for (const guild of client.guilds.cache.values()) {
    const ch = guild.channels.cache.get(BUMP_CHANNEL_ID);
    if (!ch) return;
    const pings = STAFF_ROLE_IDS.map(id => `<@&${id}>`).join(' ');
    ch.send({
      embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`⏰ time to bump the server! use \`/bump\` in this channel ♡\n${pings}`).setTimestamp()],
    });
  }
}, 2 * 60 * 60 * 1000);

// ─── Buttons ──────────────────────────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  const { customId } = interaction;
  if (customId === 'ticket_support')    return createTicket(interaction, 'support');
  if (customId === 'ticket_report')     return createTicket(interaction, 'report');
  if (customId === 'ticket_ban_appeal') return createTicket(interaction, 'ban_appeal');
  if (customId === 'ticket_close')      return closeTicket(interaction);
});

// ─── Member join ──────────────────────────────────────────────────────────────
client.on('guildMemberAdd', async (member) => {
  await checkRaid(member);

  // Auto role
  if (AUTO_ROLE_ID) await member.roles.add(AUTO_ROLE_ID).catch(() => {});

  // Alt account detection
  const ageDays = (Date.now() - member.user.createdTimestamp) / 86400000;
  if (ageDays < 7) {
    const alertCh = member.guild.channels.cache.get(ALERT_CHANNEL_ID);
    if (alertCh) alertCh.send({
      embeds: [
        new EmbedBuilder().setColor(0xFEE75C).setTitle('⚠️ Potential Alt Account')
          .setDescription(
            `**${member.user.tag}** just joined with an account only **${Math.floor(ageDays)} days old**.\n\n` +
            `> <@${member.id}>\n> account created: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`
          ).setTimestamp(),
      ],
    });
  }

  // Welcome
  const welcomeCh = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  const introCh   = member.guild.channels.cache.find(c => c.name === 'intro');
  if (welcomeCh) welcomeCh.send({
    embeds: [
      new EmbedBuilder().setColor(0x2b2d31).setTitle(`welcome to ${SERVER_NAME} ✦`)
        .setDescription(
          `hey ${member}, glad you're here! ♡\n\n` +
          `↳ read the rules in <#${RULES_CHANNEL_ID}>\n` +
          (introCh ? `↳ introduce yourself in <#${introCh.id}>` : '')
        )
        .setImage(RULES_IMAGE_URL)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `member #${member.guild.memberCount}` })
        .setTimestamp(),
    ],
  });

  // DM welcome disabled
});

// ─── Member leave ─────────────────────────────────────────────────────────────
client.on('guildMemberRemove', async (member) => {
  const ch = member.guild.channels.cache.get(GOODBYE_CHANNEL_ID);
  if (!ch) return;
  ch.send({
    embeds: [
      new EmbedBuilder().setColor(0x2b2d31)
        .setDescription(`**${member.user.tag}** has left ${SERVER_NAME}. we'll miss them ♡`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp(),
    ],
  });
});

// ─── Messages ─────────────────────────────────────────────────────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Bot mention
  if (message.mentions.has(client.user) && !message.content.startsWith(PREFIX)) {
    return message.reply('You can do it yourself.');
  }

  const isStaff = message.member?.permissions.has(PermissionFlagsBits.ModerateMembers);

  // ── Auto-mod (non-staff only) ─────────────────────────────────────────────
  if (!isStaff && message.guild) {
    // Blacklisted words
    if (containsBlacklisted(message.content)) {
      await message.delete().catch(() => {});
      const count = addWarning(message.guild.id, message.author.id, 'Used blacklisted word', 'Auto-mod');
      const reply = await message.channel.send({
        embeds: [new EmbedBuilder().setColor(0xED4245).setDescription(`❌ ${message.author} that word is not allowed here. **(warning ${count})**`).setTimestamp()],
      });
      setTimeout(() => reply.delete().catch(() => {}), 5000);
      logToChannel(message.guild, new EmbedBuilder().setColor(0xED4245).setTitle('🤬 Blacklisted Word')
        .addFields(
          { name: 'User',    value: `${message.author.tag} (${message.author.id})`, inline: true },
          { name: 'Channel', value: `<#${message.channel.id}>`,                     inline: true },
          { name: 'Total warnings', value: `${count}`,                              inline: true },
        ).setTimestamp());
      return;
    }

    // Anti-spam
    const spammed = await checkSpam(message);
    if (spammed) return;
  }

  // ── XP ────────────────────────────────────────────────────────────────────
  if (message.guild) {
    const key = `${message.guild.id}-${message.author.id}`;
    if (!xpCooldowns.has(key)) {
      xpCooldowns.set(key, true);
      setTimeout(() => xpCooldowns.delete(key), XP_COOLDOWN);
      const { level, leveledUp } = addXP(message.guild.id, message.author.id);
      if (leveledUp) {
        const msg = await message.channel.send({
          embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`✨ ${message.author} just reached **level ${level}**! ♡`).setTimestamp()],
        });
        setTimeout(() => msg.delete().catch(() => {}), 10000);
      }
    }
  }

  if (!message.content.startsWith(PREFIX)) return;
  const args    = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ══════════════════════ GENERAL COMMANDS ══════════════════════════════════

  // ,help
  if (command === 'help') {
    return message.reply({
      embeds: [
        new EmbedBuilder().setColor(0x2b2d31).setTitle(`${SERVER_NAME} — commands ✦`)
          .addFields(
            { name: '📋 general',             value: '`,ping` `,rank [@user]` `,leaderboard` `,avatar [@user]` `,userinfo [@user]` `,serverinfo` `,suggest <idea>` `,remindme <time> <msg>`' },
            { name: '🎫 tickets',             value: '`,ticket` `,adduser @user` `,removeuser @user`' },
            { name: '🔨 moderation (staff)',  value: '`,kick` `,ban` `,unban <id>` `,mute @user <mins>` `,unmute` `,warn` `,warnings` `,clearwarnings` `,purge <1-100>` `,announce <msg>` `,lockdown` `,unlockdown` `,setup`' },
          )
          .setFooter({ text: `${SERVER_NAME} ♡ | prefix: ,` }),
      ],
    });
  }

  // ,ping
  if (command === 'ping') {
    return message.reply({
      embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`🏓 pong! **${client.ws.ping}ms** ♡`)],
    });
  }

  // ,rank
  if (command === 'rank') {
    const target   = message.mentions.users.first() || message.author;
    const data     = getXP(message.guild.id, target.id);
    const needed   = xpForLevel(data.level + 1);
    const bars     = Math.floor((data.xp / needed) * 20);
    const progress = '█'.repeat(bars) + '░'.repeat(20 - bars);
    return message.reply({
      embeds: [
        new EmbedBuilder().setColor(0x2b2d31).setTitle(`${target.username}'s rank`)
          .setThumbnail(target.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: 'level', value: `${data.level}`, inline: true },
            { name: 'xp',    value: `${data.xp} / ${needed}`, inline: true },
          )
          .setDescription(`\`${progress}\``)
          .setFooter({ text: `${SERVER_NAME} ♡` }),
      ],
    });
  }

  // ,leaderboard
  if (command === 'leaderboard' || command === 'lb') {
    const guildXP = xpData[message.guild.id] || {};
    const sorted  = Object.entries(guildXP)
      .sort(([, a], [, b]) => (b.level * 10000 + b.xp) - (a.level * 10000 + a.xp))
      .slice(0, 10);
    const lines = await Promise.all(sorted.map(async ([uid, d], i) => {
      const u = await client.users.fetch(uid).catch(() => null);
      return `**${i + 1}.** ${u?.username || 'unknown'} — level **${d.level}** (${d.xp} xp)`;
    }));
    return message.reply({
      embeds: [
        new EmbedBuilder().setColor(0x2b2d31).setTitle(`${SERVER_NAME} — top members ✦`)
          .setDescription(lines.join('\n') || 'no data yet ♡').setFooter({ text: `${SERVER_NAME} ♡` }),
      ],
    });
  }

  // ,avatar
  if (command === 'avatar') {
    const target = message.mentions.users.first() || message.author;
    return message.reply({
      embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle(`${target.username}'s avatar`).setImage(target.displayAvatarURL({ dynamic: true, size: 512 }))],
    });
  }

  // ,userinfo
  if (command === 'userinfo') {
    const target = message.mentions.members.first() || message.member;
    const roles  = target.roles.cache.filter(r => r.id !== message.guild.id).map(r => `<@&${r.id}>`).join(', ') || 'none';
    return message.reply({
      embeds: [
        new EmbedBuilder().setColor(0x2b2d31).setTitle(`${target.user.username}'s info`)
          .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: 'tag',           value: target.user.tag,                                               inline: true },
            { name: 'id',            value: target.id,                                                    inline: true },
            { name: 'joined server', value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`,          inline: true },
            { name: 'account age',   value: `<t:${Math.floor(target.user.createdTimestamp / 1000)}:R>`,   inline: true },
            { name: 'roles',         value: roles },
          ).setFooter({ text: `${SERVER_NAME} ♡` }),
      ],
    });
  }

  // ,serverinfo
  if (command === 'serverinfo') {
    const g = message.guild;
    return message.reply({
      embeds: [
        new EmbedBuilder().setColor(0x2b2d31).setTitle(`${g.name} — server info`)
          .setThumbnail(g.iconURL({ dynamic: true }))
          .addFields(
            { name: 'owner',       value: `<@${g.ownerId}>`,                               inline: true },
            { name: 'members',     value: `${g.memberCount}`,                              inline: true },
            { name: 'boosts',      value: `${g.premiumSubscriptionCount}`,                 inline: true },
            { name: 'boost level', value: `level ${g.premiumTier}`,                        inline: true },
            { name: 'created',     value: `<t:${Math.floor(g.createdTimestamp / 1000)}:R>`, inline: true },
          ).setFooter({ text: `${SERVER_NAME} ♡` }),
      ],
    });
  }

  // ,suggest
  if (command === 'suggest') {
    const idea = args.join(' ');
    if (!idea) return message.reply('❌ please provide a suggestion.');
    const forumCh = message.guild.channels.cache.get(SUGGESTIONS_CHANNEL_ID);
    if (!forumCh) return message.reply('❌ suggestions channel not found.');
    try {
      await forumCh.threads.create({
        name: `suggestion by ${message.author.username}`,
        message: {
          embeds: [
            new EmbedBuilder().setColor(0x2b2d31).setTitle('💡 new suggestion').setDescription(idea)
              .setFooter({ text: `suggested by ${message.author.tag}` }).setTimestamp(),
          ],
        },
      });
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription('✅ your suggestion has been submitted ♡')] });
    } catch {
      return message.reply('❌ could not post — make sure the channel is a forum channel.');
    }
  }

  // ,remindme
  if (command === 'remindme') {
    const timeStr = args[0];
    const msg     = args.slice(1).join(' ');
    if (!timeStr || !msg) return message.reply('❌ usage: `,remindme <time> <message>` (e.g. `,remindme 2h check server`)');
    const ms = parseTime(timeStr);
    if (!ms) return message.reply('❌ invalid time. use `s`, `m`, `h`, or `d` (e.g. `30m`, `2h`, `1d`)');
    if (!reminderData[message.author.id]) reminderData[message.author.id] = [];
    reminderData[message.author.id].push({ time: Date.now() + ms, message: msg });
    saveData('reminders.json', reminderData);
    return message.reply({
      embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`⏰ i'll remind you about "**${msg}**" <t:${Math.floor((Date.now() + ms) / 1000)}:R> ♡`)],
    });
  }

  // ,ticket
  if (command === 'ticket') {
    const map  = { support: 'support', report: 'report', appeal: 'ban_appeal', ban_appeal: 'ban_appeal' };
    const type = map[args[0]?.toLowerCase()];
    if (!type) {
      return message.reply({
        content: 'what kind of ticket do you need? ♡',
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setEmoji('🎀').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ticket_report').setLabel('Report a User').setEmoji('⚠️').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ticket_ban_appeal').setLabel('Ban Appeal').setEmoji('📋').setStyle(ButtonStyle.Secondary),
          ),
        ],
      });
    }
    return createTicket({ guild: message.guild, member: message.member, user: message.author, reply: o => message.reply(o) }, type);
  }

  // ══════════════════════ STAFF ONLY ════════════════════════════════════════
  if (!isStaff) return;

  // ,adduser
  if (command === 'adduser') {
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Please mention a user.');
    await message.channel.permissionOverwrites.edit(target, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
    return message.reply(`✅ Added **${target.user.tag}** to this ticket.`);
  }

  // ,removeuser
  if (command === 'removeuser') {
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Please mention a user.');
    await message.channel.permissionOverwrites.edit(target, { ViewChannel: false });
    return message.reply(`✅ Removed **${target.user.tag}** from this ticket.`);
  }

  // ,warn
  if (command === 'warn') {
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Please mention a user.');
    const reason = args.slice(1).join(' ') || 'No reason provided';
    const count  = addWarning(message.guild.id, target.id, reason, message.author.tag);
    const embed  = new EmbedBuilder().setColor(0xFEE75C).setTitle('⚠️ member warned')
      .addFields(
        { name: 'user',      value: target.user.tag,    inline: true },
        { name: 'moderator', value: message.author.tag, inline: true },
        { name: 'reason',    value: reason },
        { name: 'total warnings', value: `${count}` },
      ).setTimestamp();
    message.channel.send({ embeds: [embed] });
    target.user.send({ embeds: [embed] }).catch(() => {});
    return logToChannel(message.guild, embed);
  }

  // ,warnings
  if (command === 'warnings') {
    const target = message.mentions.members.first() || message.member;
    const warns  = getWarnings(message.guild.id, target.id);
    if (!warns.length) return message.reply(`✅ **${target.user.tag}** has no warnings.`);
    const list = warns.map((w, i) =>
      `**${i + 1}.** ${w.reason} — by ${w.moderator} <t:${Math.floor(new Date(w.date).getTime() / 1000)}:R>`
    ).join('\n');
    return message.reply({
      embeds: [
        new EmbedBuilder().setColor(0xFEE75C).setTitle(`${target.user.username}'s warnings`)
          .setDescription(list).setFooter({ text: `total: ${warns.length}` }),
      ],
    });
  }

  // ,clearwarnings
  if (command === 'clearwarnings') {
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Please mention a user.');
    clearWarnings(message.guild.id, target.id);
    return message.reply(`✅ Cleared all warnings for **${target.user.tag}**.`);
  }

  // ,announce
  if (command === 'announce') {
    const text = args.join(' ');
    if (!text) return message.reply('❌ please provide a message.');
    const ch = message.guild.channels.cache.get(ANNOUNCE_CHANNEL_ID);
    if (!ch) return message.reply('❌ announce channel not found.');
    await ch.send({
      embeds: [
        new EmbedBuilder().setColor(0x2b2d31).setTitle('📢 announcement').setDescription(text)
          .setFooter({ text: `announced by ${message.author.tag}` }).setTimestamp(),
      ],
    });
    return message.reply('✅ Announcement sent!');
  }

  // ,lockdown
  if (command === 'lockdown') {
    const channels = message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
    for (const [, ch] of channels) await ch.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false }).catch(() => {});
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('🔒 server locked down. members cannot send messages.').setTimestamp()],
    });
  }

  // ,unlockdown
  if (command === 'unlockdown') {
    const channels = message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
    for (const [, ch] of channels) await ch.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null }).catch(() => {});
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription('🔓 server unlocked. members can send messages again ♡').setTimestamp()],
    });
  }

  // ,setup
  if (command === 'setup') {
    await postRules(message.guild);
    await postTicketPanel(message.guild);
    return message.reply('✅ Rules & ticket panel updated!').then(m => setTimeout(() => m.delete().catch(() => {}), 4000));
  }

  // ,kick
  if (command === 'kick') {
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Please mention a user.');
    if (!target.kickable) return message.reply('❌ I cannot kick this user.');
    const reason = args.slice(1).join(' ') || 'No reason provided';
    await target.kick(reason);
    const embed = modEmbed('🥾 member kicked', target.user, message.author, reason);
    message.channel.send({ embeds: [embed] });
    return logToChannel(message.guild, embed);
  }

  // ,ban
  if (command === 'ban') {
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Please mention a user.');
    if (!target.bannable) return message.reply('❌ I cannot ban this user.');
    const reason = args.slice(1).join(' ') || 'No reason provided';
    await target.ban({ reason });
    const embed = modEmbed('🔨 member banned', target.user, message.author, reason);
    message.channel.send({ embeds: [embed] });
    return logToChannel(message.guild, embed);
  }

  // ,unban
  if (command === 'unban') {
    if (!args[0]) return message.reply('❌ Please provide a user ID.');
    try {
      const u = await message.guild.members.unban(args[0]);
      message.reply(`✅ Unbanned **${u.tag}**.`);
    } catch { message.reply('❌ Could not find a ban for that user ID.'); }
    return;
  }

  // ,mute
  if (command === 'mute') {
    const target  = message.mentions.members.first();
    const minutes = parseInt(args[1]);
    if (!target) return message.reply('❌ Please mention a user.');
    if (isNaN(minutes) || minutes < 1) return message.reply('❌ Provide valid minutes.');
    const reason = args.slice(2).join(' ') || 'No reason provided';
    await target.timeout(minutes * 60 * 1000, reason);
    const embed = modEmbed(`🔇 member muted (${minutes}m)`, target.user, message.author, reason);
    message.channel.send({ embeds: [embed] });
    return logToChannel(message.guild, embed);
  }

  // ,unmute
  if (command === 'unmute') {
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Please mention a user.');
    await target.timeout(null);
    return message.reply(`✅ Unmuted **${target.user.tag}**.`);
  }

  // ,purge
  if (command === 'purge') {
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100) return message.reply('❌ Provide a number 1–100.');
    await message.channel.bulkDelete(amount + 1, true);
    const msg = await message.channel.send(`✅ Deleted **${amount}** messages.`);
    setTimeout(() => msg.delete().catch(() => {}), 3000);
    return;
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function modEmbed(title, targetUser, moderator, reason) {
  return new EmbedBuilder().setColor(0x2b2d31).setTitle(title)
    .addFields(
      { name: 'user',      value: `${targetUser.tag} (${targetUser.id})`, inline: true },
      { name: 'moderator', value: moderator.tag,                           inline: true },
      { name: 'reason',    value: reason },
    ).setTimestamp();
}

client.login(process.env.DISCORD_TOKEN);
