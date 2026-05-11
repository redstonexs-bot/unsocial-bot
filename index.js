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
  REST,
  Routes,
  SlashCommandBuilder,
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
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// ─── Config ───────────────────────────────────────────────────────────────────
const WELCOME_CHANNEL_ID     = process.env.WELCOME_CHANNEL_ID;
const GOODBYE_CHANNEL_ID     = process.env.GOODBYE_CHANNEL_ID;
const RULES_CHANNEL_ID       = process.env.RULES_CHANNEL_ID;
const TICKETS_CHANNEL_ID     = process.env.TICKETS_CHANNEL_ID;
const TICKET_CATEGORY_ID     = process.env.TICKET_CATEGORY_ID;
const MOD_ROLE_ID            = process.env.MOD_ROLE_ID;
const COOWNER_ROLE_ID        = process.env.COOWNER_ROLE_ID;
const OWNER_ROLE_ID          = process.env.OWNER_ROLE_ID;

const SUGGESTIONS_CHANNEL_ID = '1503081779571986614';
const ALERT_CHANNEL_ID       = '1486680372560527503';
const LOG_CHANNEL_ID         = '1503042913867792476';
const ANNOUNCE_CHANNEL_ID    = '1486682318822178906';
const BUMP_CHANNEL_ID        = '1486680372560527500';
const BOOSTER_ROLE_ID        = '1503318419880149053';
const BOOST_ANNOUNCE_ID      = '1497409941445546105';
const OWNER_USER_ID          = '1323308066523058239';

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

// ─── Data ─────────────────────────────────────────────────────────────────────
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
let starsData    = loadData('stars.json');

// ─── XP ───────────────────────────────────────────────────────────────────────
const xpCooldowns = new Map();
const XP_COOLDOWN = 60000;
function getXP(guildId, userId) {
  if (!xpData[guildId]) xpData[guildId] = {};
  if (!xpData[guildId][userId]) xpData[guildId][userId] = { xp: 0, level: 0, totalXp: 0 };
  return xpData[guildId][userId];
}
function xpForLevel(level) { return Math.floor(100 * Math.pow(1.15, level)); }
function addXP(guildId, userId, amount = 15) {
  const data    = getXP(guildId, userId);
  data.xp      += amount;
  data.totalXp  = (data.totalXp || 0) + amount;
  const needed  = xpForLevel(data.level + 1);
  let leveledUp = false;
  while (data.xp >= xpForLevel(data.level + 1)) {
    data.xp -= xpForLevel(data.level + 1);
    data.level++;
    leveledUp = true;
  }
  xpData[guildId][userId] = data;
  saveData('xp.json', xpData);
  return { ...data, leveledUp, needed: xpForLevel(data.level + 1) };
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function getStars(guildId, userId) {
  if (!starsData[guildId]) starsData[guildId] = {};
  return starsData[guildId][userId] || 0;
}
function addStars(guildId, userId, amount) {
  if (!starsData[guildId]) starsData[guildId] = {};
  starsData[guildId][userId] = Math.max(0, (starsData[guildId][userId] || 0) + amount);
  saveData('stars.json', starsData);
  return starsData[guildId][userId];
}

// ─── Warnings ─────────────────────────────────────────────────────────────────
function getWarnings(guildId, userId) {
  if (!warningData[guildId]) warningData[guildId] = {};
  return warningData[guildId][userId] || [];
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
  const now = Date.now(); let changed = false;
  for (const uid in reminderData) {
    const before = reminderData[uid].length;
    reminderData[uid] = reminderData[uid].filter(r => {
      if (now >= r.time) {
        client.users.fetch(uid).then(u => u.send({
          embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle('⏰ reminder!').setDescription(r.message).setFooter({ text: `${SERVER_NAME} ♡` }).setTimestamp()],
        })).catch(() => {});
        return false;
      }
      return true;
    });
    if (reminderData[uid].length !== before) changed = true;
  }
  if (changed) saveData('reminders.json', reminderData);
}, 30000);

// ─── Anti-spam ────────────────────────────────────────────────────────────────
const spamMap = new Map();
async function checkSpam(message) {
  const uid = message.author.id;
  if (!spamMap.has(uid)) {
    spamMap.set(uid, { count: 1, timer: setTimeout(() => spamMap.delete(uid), 5000) });
    return false;
  }
  const d = spamMap.get(uid);
  d.count++;
  if (d.count >= 8) {
    clearTimeout(d.timer); spamMap.delete(uid);
    await message.member.timeout(5 * 60 * 1000, 'Auto-mod: spam').catch(() => {});
    message.channel.send({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription(`🔇 ${message.author} muted for **5 minutes** for spamming.`).setTimestamp()] });
    logEmbed(message.guild, new EmbedBuilder().setColor(0xED4245).setTitle('🔇 Auto-Mod: Spam')
      .addFields({ name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true }, { name: 'Channel', value: `<#${message.channel.id}>`, inline: true }).setTimestamp());
    return true;
  }
  return false;
}

// ─── Anti-raid (improved) ─────────────────────────────────────────────────────
const recentJoins    = [];
const RAID_THRESHOLD = 3;
const RAID_INTERVAL  = 5000;

async function checkRaid(member) {
  const guild = member.guild;

  // Instantly ban bot accounts that weren't invited by owner
  if (member.user.bot) {
    const isKnownBot = STAFF_ROLE_IDS.some(id => member.roles.cache.has(id));
    if (!isKnownBot) {
      await guild.members.ban(member.id, { reason: 'Auto-mod: unauthorized bot account' }).catch(() => {});
      const alertCh = guild.channels.cache.get(ALERT_CHANNEL_ID);
      if (alertCh) alertCh.send({
        embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('🤖 Unauthorized Bot Banned')
          .setDescription(`**${member.user.tag}** (${member.id}) tried to join as a bot and was instantly banned.`).setTimestamp()],
      });
      return;
    }
  }

  // Instantly ban accounts under 1 day old
  const ageDays = (Date.now() - member.user.createdTimestamp) / 86400000;
  if (ageDays < 1) {
    await guild.members.ban(member.id, { reason: 'Auto-mod: account too new (< 1 day old)' }).catch(() => {});
    const alertCh = guild.channels.cache.get(ALERT_CHANNEL_ID);
    if (alertCh) alertCh.send({
      embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('🚫 Brand New Account Banned')
        .setDescription(`**${member.user.tag}** was banned — account was only **${Math.floor(ageDays * 24)} hours** old.`).setTimestamp()],
    });
    return;
  }

  // Flag accounts under 7 days
  if (ageDays < 7) {
    const alertCh = guild.channels.cache.get(ALERT_CHANNEL_ID);
    if (alertCh) alertCh.send({
      embeds: [new EmbedBuilder().setColor(0xFEE75C).setTitle('⚠️ Potential Alt Account')
        .setDescription(`**${member.user.tag}** joined with an account only **${Math.floor(ageDays)} days** old.\n> <@${member.id}>\n> created: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`).setTimestamp()],
    });
  }

  // Mass join detection
  const now = Date.now();
  recentJoins.push({ id: member.id, tag: member.user.tag, time: now });
  const window = recentJoins.filter(j => now - j.time < RAID_INTERVAL);
  recentJoins.length = 0;
  recentJoins.push(...window);
  if (window.length < RAID_THRESHOLD) return;

  const raiders = [...window];

  // Lock all channels
  guild.channels.cache.filter(c => c.type === ChannelType.GuildText).forEach(ch => {
    ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }).catch(() => {});
  });

  // Public humiliation
  const list = raiders.map(r => `• **${r.tag}** (<@${r.id}>)`).join('\n');
  const alertCh = guild.channels.cache.get(ALERT_CHANNEL_ID);
  if (alertCh) alertCh.send({
    embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('🚨 RAID DETECTED & NEUTRALIZED')
      .setDescription(
        `an attempted raid by **${raiders.length}** accounts has been stopped.\n\n` +
        `the following tried to raid **${SERVER_NAME}** and got instantly banned:\n\n${list}\n\n` +
        `better luck next time 💀\n\n*use \`/unlockdown\` to restore the server.*`
      ).setTimestamp()],
  });

  for (const r of raiders) await guild.members.ban(r.id, { reason: 'Auto-mod: raid' }).catch(() => {});

  // DM owner
  client.users.fetch(OWNER_USER_ID).then(u => u.send({
    embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('🚨 Raid Alert')
      .setDescription(`A raid was detected on **${guild.name}**. ${raiders.length} accounts were banned. Server is in lockdown — use \`/unlockdown\` to restore.`).setTimestamp()],
  })).catch(() => {});

  recentJoins.length = 0;
}

// ─── Auto-mod helpers ─────────────────────────────────────────────────────────
function containsBlacklisted(text) {
  const clean = text.toLowerCase().replace(/[\s\-_.]+/g, '');
  return /n+[i!1|l]+[g9qc]+[g9qc]+[e3a@o0]+[rz]*/i.test(clean);
}

// ─── Log helper ───────────────────────────────────────────────────────────────
async function logEmbed(guild, embed) {
  const ch = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (ch) ch.send({ embeds: [embed] });
}

// ─── Rules & ticket panel ─────────────────────────────────────────────────────
async function buildRulesMessage() {
  return {
    embeds: [
      new EmbedBuilder().setColor(0x2b2d31).setImage(RULES_IMAGE_URL),
      new EmbedBuilder().setColor(0x2b2d31).setTitle(`welcome to ${SERVER_NAME} ✦`)
        .setDescription(`${SERVER_DESC}\n\n> acknowledge our server rules before\n> interacting in ${SERVER_NAME} 🎀\n\nfollow **[discord terms](https://discord.com/terms)** & **[guidelines](https://discord.com/guidelines)**\n↳ this server follows discord guidelines!`),
      new EmbedBuilder().setColor(0x2b2d31)
        .setDescription(RULES.map((r, i) => `♡ **${i + 1}. ${r.title}**\n↳ ${r.desc}`).join('\n\n'))
        .setFooter({ text: 'done reading? check out #chat ♡' }),
    ],
  };
}

async function postRules(guild) {
  const ch = guild.channels.cache.get(RULES_CHANNEL_ID);
  if (!ch) return console.warn('⚠️  RULES_CHANNEL_ID not found.');
  const old = (await ch.messages.fetch({ limit: 20 })).filter(m => m.author.id === client.user.id);
  if (old.size) await ch.bulkDelete(old).catch(() => {});
  await ch.send(await buildRulesMessage());
  console.log('✅ Rules posted.');
}

async function postTicketPanel(guild) {
  const ch = guild.channels.cache.get(TICKETS_CHANNEL_ID);
  if (!ch) return console.warn('⚠️  TICKETS_CHANNEL_ID not found.');
  const old = (await ch.messages.fetch({ limit: 20 })).filter(m => m.author.id === client.user.id);
  if (old.size) await ch.bulkDelete(old).catch(() => {});
  await ch.send({
    embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle(`${SERVER_NAME} — support ✦`)
      .setDescription(`need help or want to report something?\nclick a button below to open a ticket ♡\n\n🎀 **support** — general help or questions\n⚠️ **report a user** — report a rule-breaking member\n📋 **ban appeal** — appeal a ban or punishment`)
      .setFooter({ text: 'please only open tickets for genuine issues ♡' })],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_support').setLabel('Support').setEmoji('🎀').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ticket_report').setLabel('Report a User').setEmoji('⚠️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ticket_ban_appeal').setLabel('Ban Appeal').setEmoji('📋').setStyle(ButtonStyle.Secondary),
    )],
  });
  console.log('✅ Ticket panel posted.');
}

// ─── Ticket create/close ──────────────────────────────────────────────────────
async function createTicket(interaction, type) {
  const guild = interaction.guild, member = interaction.member;
  const { label, emoji } = TICKET_TYPES[type];
  const existing = guild.channels.cache.find(c => c.name === `${type}-${member.user.username}` && c.topic?.includes(member.id));
  if (existing) return interaction.reply({ content: `❌ You already have an open ticket: <#${existing.id}>`, ephemeral: true });

  const ticketChannel = await guild.channels.create({
    name: `${type}-${member.user.username}`,
    type: ChannelType.GuildText,
    parent: TICKET_CATEGORY_ID || null,
    topic: `Ticket by ${member.user.tag} (${member.id}) | Type: ${label}`,
    permissionOverwrites: [
      { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
      { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      ...STAFF_ROLE_IDS.map(id => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] })),
    ],
  });

  await ticketChannel.send({
    content: `${member} ${STAFF_ROLE_IDS.map(id => `<@&${id}>`).join(' ')}`,
    embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle(`${emoji} ${label} ticket`)
      .setDescription(`hey ${member}, thanks for reaching out ♡\n\nplease describe your issue and staff will be with you shortly.\n\n> **ticket type:** ${label}\n> **opened by:** ${member.user.tag}`)
      .setFooter({ text: `${SERVER_NAME} support` }).setTimestamp()],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_close').setLabel('Close Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger),
    )],
  });
  await interaction.reply({ content: `✅ Ticket opened: <#${ticketChannel.id}>`, ephemeral: true });
}

async function closeTicket(interaction) {
  const channel = interaction.channel;
  const isMod = interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers);
  const isOwner = channel.topic?.includes(interaction.user.id);
  if (!isMod && !isOwner) return interaction.reply({ content: '❌ Only staff or the ticket owner can close this.', ephemeral: true });

  await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('🔒 closing ticket — saving transcript and deleting in 10 seconds.').setTimestamp()] });

  const messages   = await channel.messages.fetch({ limit: 100 });
  const transcript = [...messages.values()].reverse()
    .map(m => `[${new Date(m.createdTimestamp).toLocaleString()}] ${m.author.tag}: ${m.content || '[embed/attachment]'}`).join('\n');
  const attachment = new AttachmentBuilder(Buffer.from(transcript, 'utf8'), { name: `transcript-${channel.name}.txt` });
  const logCh = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (logCh) logCh.send({
    embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('🔒 Ticket Closed')
      .addFields({ name: 'Channel', value: channel.name, inline: true }, { name: 'Closed by', value: interaction.user.tag, inline: true }, { name: 'Topic', value: channel.topic || 'N/A' }).setTimestamp()],
    files: [attachment],
  });
  setTimeout(() => channel.delete().catch(() => {}), 10000);
}

// ─── Slash commands definition ────────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder().setName('help').setDescription('show all commands'),
  new SlashCommandBuilder().setName('ping').setDescription('check bot response time'),
  new SlashCommandBuilder().setName('rank').setDescription('check your rank or someone elses').addUserOption(o => o.setName('user').setDescription('user to check').setRequired(false)),
  new SlashCommandBuilder().setName('leaderboard').setDescription('top members by xp and stars'),
  new SlashCommandBuilder().setName('profile').setDescription('view full profile').addUserOption(o => o.setName('user').setDescription('user to check').setRequired(false)),
  new SlashCommandBuilder().setName('avatar').setDescription('get a users avatar').addUserOption(o => o.setName('user').setDescription('user').setRequired(false)),
  new SlashCommandBuilder().setName('userinfo').setDescription('info about a user').addUserOption(o => o.setName('user').setDescription('user').setRequired(false)),
  new SlashCommandBuilder().setName('serverinfo').setDescription('info about the server'),
  new SlashCommandBuilder().setName('suggest').setDescription('submit a suggestion').addStringOption(o => o.setName('idea').setDescription('your suggestion').setRequired(true)),
  new SlashCommandBuilder().setName('remindme').setDescription('set a reminder').addStringOption(o => o.setName('time').setDescription('e.g. 30m, 2h, 1d').setRequired(true)).addStringOption(o => o.setName('message').setDescription('what to remind you about').setRequired(true)),
  new SlashCommandBuilder().setName('ticket').setDescription('open a support ticket').addStringOption(o => o.setName('type').setDescription('ticket type').setRequired(true).addChoices({ name: '🎀 Support', value: 'support' }, { name: '⚠️ Report a User', value: 'report' }, { name: '📋 Ban Appeal', value: 'ban_appeal' })),
  new SlashCommandBuilder().setName('adduser').setDescription('add a user to this ticket').addUserOption(o => o.setName('user').setDescription('user to add').setRequired(true)),
  new SlashCommandBuilder().setName('removeuser').setDescription('remove a user from this ticket').addUserOption(o => o.setName('user').setDescription('user to remove').setRequired(true)),
  new SlashCommandBuilder().setName('addstars').setDescription('[staff] give stars to a member').addUserOption(o => o.setName('user').setDescription('user').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('how many stars').setRequired(true)),
  new SlashCommandBuilder().setName('removestars').setDescription('[staff] remove stars from a member').addUserOption(o => o.setName('user').setDescription('user').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('how many stars').setRequired(true)),
  new SlashCommandBuilder().setName('stars').setDescription('check how many stars a user has').addUserOption(o => o.setName('user').setDescription('user').setRequired(false)),
  new SlashCommandBuilder().setName('warn').setDescription('[staff] warn a member').addUserOption(o => o.setName('user').setDescription('user').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('reason').setRequired(false)),
  new SlashCommandBuilder().setName('warnings').setDescription('[staff] check warnings').addUserOption(o => o.setName('user').setDescription('user').setRequired(true)),
  new SlashCommandBuilder().setName('clearwarnings').setDescription('[staff] clear all warnings').addUserOption(o => o.setName('user').setDescription('user').setRequired(true)),
  new SlashCommandBuilder().setName('kick').setDescription('[staff] kick a member').addUserOption(o => o.setName('user').setDescription('user').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('reason').setRequired(false)),
  new SlashCommandBuilder().setName('ban').setDescription('[staff] ban a member').addUserOption(o => o.setName('user').setDescription('user').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('reason').setRequired(false)),
  new SlashCommandBuilder().setName('unban').setDescription('[staff] unban a user by ID').addStringOption(o => o.setName('id').setDescription('user ID').setRequired(true)),
  new SlashCommandBuilder().setName('mute').setDescription('[staff] mute a member').addUserOption(o => o.setName('user').setDescription('user').setRequired(true)).addIntegerOption(o => o.setName('minutes').setDescription('duration in minutes').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('reason').setRequired(false)),
  new SlashCommandBuilder().setName('unmute').setDescription('[staff] unmute a member').addUserOption(o => o.setName('user').setDescription('user').setRequired(true)),
  new SlashCommandBuilder().setName('purge').setDescription('[staff] delete messages').addIntegerOption(o => o.setName('amount').setDescription('1-100').setRequired(true)),
  new SlashCommandBuilder().setName('announce').setDescription('[staff] post an announcement').addStringOption(o => o.setName('message').setDescription('announcement text').setRequired(true)),
  new SlashCommandBuilder().setName('lockdown').setDescription('[staff] lock all channels'),
  new SlashCommandBuilder().setName('unlockdown').setDescription('[staff] unlock all channels'),
  new SlashCommandBuilder().setName('setup').setDescription('[staff] repost rules and ticket panel'),
].map(c => c.toJSON());

// ─── Register slash commands ───────────────────────────────────────────────────
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('⏳ Registering slash commands...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('✅ Slash commands registered.');
  } catch (e) { console.error('❌ Failed to register commands:', e); }
}

// ─── Ready ────────────────────────────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity(`${SERVER_NAME} | /help`);
  await registerCommands();
  for (const guild of client.guilds.cache.values()) {
    await postRules(guild).catch(console.error);
    await postTicketPanel(guild).catch(console.error);
  }
});

// Bump reminder
setInterval(() => {
  for (const guild of client.guilds.cache.values()) {
    const ch = guild.channels.cache.get(BUMP_CHANNEL_ID);
    if (!ch) return;
    ch.send({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`⏰ time to bump the server! use \`/bump\` ♡\n${STAFF_ROLE_IDS.map(id => `<@&${id}>`).join(' ')}`).setTimestamp()] });
  }
}, 2 * 60 * 60 * 1000);

// ─── Buttons ──────────────────────────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    const { customId } = interaction;
    if (customId === 'ticket_support')    return createTicket(interaction, 'support');
    if (customId === 'ticket_report')     return createTicket(interaction, 'report');
    if (customId === 'ticket_ban_appeal') return createTicket(interaction, 'ban_appeal');
    if (customId === 'ticket_close')      return closeTicket(interaction);
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const { commandName, guild, member, user } = interaction;
  const isStaff = member?.permissions.has(PermissionFlagsBits.ModerateMembers);

  // ── General ──────────────────────────────────────────────────────────────

  if (commandName === 'help') {
    return interaction.reply({
      embeds: [
        new EmbedBuilder().setColor(0x2b2d31).setTitle(`${SERVER_NAME} — commands ✦`)
          .setDescription('all commands use `/` — just type `/` to see them all with descriptions ♡')
          .addFields(
            { name: '📋 general',            value: '`/ping` `/rank` `/leaderboard` `/profile` `/avatar` `/userinfo` `/serverinfo` `/suggest` `/remindme` `/ticket` `/stars`' },
            { name: '🔨 moderation (staff)', value: '`/kick` `/ban` `/unban` `/mute` `/unmute` `/warn` `/warnings` `/clearwarnings` `/purge` `/announce` `/lockdown` `/unlockdown` `/addstars` `/removestars` `/setup`' },
          )
          .setFooter({ text: `${SERVER_NAME} ♡` }),
      ],
      ephemeral: true,
    });
  }

  if (commandName === 'ping') {
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`🏓 pong! **${client.ws.ping}ms** ♡`)], ephemeral: true });
  }

  if (commandName === 'rank') {
    const target  = interaction.options.getUser('user') || user;
    const data    = getXP(guild.id, target.id);
    const needed  = xpForLevel(data.level + 1);
    const bars    = Math.min(20, Math.floor((data.xp / needed) * 20));
    const progress = '█'.repeat(bars) + '░'.repeat(20 - bars);
    return interaction.reply({
      embeds: [
        new EmbedBuilder().setColor(0x2b2d31).setTitle(`${target.username}'s rank ✦`)
          .setThumbnail(target.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: '⭐ level', value: `${data.level}`, inline: true },
            { name: '✨ xp',    value: `${data.xp} / ${needed}`, inline: true },
            { name: '📊 total xp', value: `${data.totalXp || 0}`, inline: true },
          )
          .setDescription(`\`${progress}\``)
          .setFooter({ text: `${SERVER_NAME} ♡` }),
      ],
    });
  }

  if (commandName === 'leaderboard') {
    await interaction.deferReply();
    const guildXP    = xpData[guild.id] || {};
    const guildStars = starsData[guild.id] || {};

    const xpSorted = Object.entries(guildXP)
      .sort(([, a], [, b]) => (b.level * 100000 + (b.totalXp || 0)) - (a.level * 100000 + (a.totalXp || 0)))
      .slice(0, 10);

    const starsSorted = Object.entries(guildStars)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    const medals = ['🥇', '🥈', '🥉'];
    const xpLines = await Promise.all(xpSorted.map(async ([uid, d], i) => {
      const u = await client.users.fetch(uid).catch(() => null);
      const medal = medals[i] || `**${i + 1}.**`;
      return `${medal} ${u?.username || 'unknown'} ↳ level **${d.level}** • ${d.totalXp || 0} total xp`;
    }));

    const starLines = await Promise.all(starsSorted.map(async ([uid, stars], i) => {
      const u = await client.users.fetch(uid).catch(() => null);
      const medal = medals[i] || `**${i + 1}.**`;
      return `${medal} ${u?.username || 'unknown'} ↳ **${stars}** ⭐`;
    }));

    return interaction.editReply({
      embeds: [
        new EmbedBuilder().setColor(0x2b2d31)
          .setTitle(`${SERVER_NAME} — leaderboard ✦`)
          .setDescription('*the most active and appreciated members of the server* ♡')
          .addFields(
            { name: '✨ top xp', value: xpLines.join('\n') || 'no data yet', inline: false },
            { name: '⭐ top stars', value: starLines.join('\n') || 'no data yet', inline: false },
          )
          .setFooter({ text: `${SERVER_NAME} ♡ • updated live` })
          .setTimestamp(),
      ],
    });
  }

  if (commandName === 'profile') {
    const target  = interaction.options.getUser('user') || user;
    const xp      = getXP(guild.id, target.id);
    const stars   = getStars(guild.id, target.id);
    const warns   = getWarnings(guild.id, target.id).length;
    const member2 = await guild.members.fetch(target.id).catch(() => null);
    return interaction.reply({
      embeds: [
        new EmbedBuilder().setColor(0x2b2d31).setTitle(`${target.username}'s profile ✦`)
          .setThumbnail(target.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: '⭐ level',    value: `${xp.level}`,         inline: true },
            { name: '✨ total xp', value: `${xp.totalXp || 0}`,  inline: true },
            { name: '🌟 stars',   value: `${stars}`,             inline: true },
            { name: '⚠️ warnings', value: `${warns}`,            inline: true },
            { name: '📅 joined',  value: member2 ? `<t:${Math.floor(member2.joinedTimestamp / 1000)}:R>` : 'unknown', inline: true },
          )
          .setFooter({ text: `${SERVER_NAME} ♡` }).setTimestamp(),
      ],
    });
  }

  if (commandName === 'stars') {
    const target = interaction.options.getUser('user') || user;
    const count  = getStars(guild.id, target.id);
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`⭐ **${target.username}** has **${count}** stars ♡`).setFooter({ text: `${SERVER_NAME} ♡` })],
    });
  }

  if (commandName === 'avatar') {
    const target = interaction.options.getUser('user') || user;
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle(`${target.username}'s avatar`).setImage(target.displayAvatarURL({ dynamic: true, size: 512 }))] });
  }

  if (commandName === 'userinfo') {
    const target  = interaction.options.getMember('user') || member;
    const roles   = target.roles.cache.filter(r => r.id !== guild.id).map(r => `<@&${r.id}>`).join(', ') || 'none';
    return interaction.reply({
      embeds: [
        new EmbedBuilder().setColor(0x2b2d31).setTitle(`${target.user.username}'s info ✦`)
          .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: 'tag',           value: target.user.tag,                                             inline: true },
            { name: 'id',            value: target.id,                                                   inline: true },
            { name: 'joined server', value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`,        inline: true },
            { name: 'account age',   value: `<t:${Math.floor(target.user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: 'roles',         value: roles },
          ).setFooter({ text: `${SERVER_NAME} ♡` }),
      ],
    });
  }

  if (commandName === 'serverinfo') {
    const g = guild;
    return interaction.reply({
      embeds: [
        new EmbedBuilder().setColor(0x2b2d31).setTitle(`${g.name} — server info ✦`)
          .setThumbnail(g.iconURL({ dynamic: true }))
          .addFields(
            { name: 'owner',       value: `<@${g.ownerId}>`,                                inline: true },
            { name: 'members',     value: `${g.memberCount}`,                               inline: true },
            { name: 'boosts',      value: `${g.premiumSubscriptionCount}`,                  inline: true },
            { name: 'boost level', value: `level ${g.premiumTier}`,                         inline: true },
            { name: 'created',     value: `<t:${Math.floor(g.createdTimestamp / 1000)}:R>`, inline: true },
          ).setFooter({ text: `${SERVER_NAME} ♡` }),
      ],
    });
  }

  if (commandName === 'suggest') {
    const idea    = interaction.options.getString('idea');
    const forumCh = guild.channels.cache.get(SUGGESTIONS_CHANNEL_ID);
    if (!forumCh) return interaction.reply({ content: '❌ suggestions channel not found.', ephemeral: true });
    try {
      await forumCh.threads.create({
        name: `suggestion by ${user.username}`,
        message: { embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle('💡 new suggestion').setDescription(idea).setFooter({ text: `suggested by ${user.tag}` }).setTimestamp()] },
      });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription('✅ your suggestion has been submitted ♡')], ephemeral: true });
    } catch { return interaction.reply({ content: '❌ could not post — make sure the channel is a forum channel.', ephemeral: true }); }
  }

  if (commandName === 'remindme') {
    const timeStr = interaction.options.getString('time');
    const msg     = interaction.options.getString('message');
    const ms      = parseTime(timeStr);
    if (!ms) return interaction.reply({ content: '❌ invalid time. use `s`, `m`, `h`, or `d` (e.g. `30m`, `2h`, `1d`)', ephemeral: true });
    if (!reminderData[user.id]) reminderData[user.id] = [];
    reminderData[user.id].push({ time: Date.now() + ms, message: msg });
    saveData('reminders.json', reminderData);
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`⏰ i'll remind you about "**${msg}**" <t:${Math.floor((Date.now() + ms) / 1000)}:R> ♡`)], ephemeral: true });
  }

  if (commandName === 'ticket') {
    return createTicket(interaction, interaction.options.getString('type'));
  }

  // ── Staff only ───────────────────────────────────────────────────────────
  if (!isStaff) return interaction.reply({ content: '❌ you don\'t have permission to use this command.', ephemeral: true });

  if (commandName === 'adduser') {
    const target = interaction.options.getMember('user');
    await interaction.channel.permissionOverwrites.edit(target, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
    return interaction.reply({ content: `✅ Added **${target.user.tag}** to this ticket.`, ephemeral: true });
  }

  if (commandName === 'removeuser') {
    const target = interaction.options.getMember('user');
    await interaction.channel.permissionOverwrites.edit(target, { ViewChannel: false });
    return interaction.reply({ content: `✅ Removed **${target.user.tag}** from this ticket.`, ephemeral: true });
  }

  if (commandName === 'addstars') {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const total  = addStars(guild.id, target.id, amount);
    const embed  = new EmbedBuilder().setColor(0x2b2d31).setTitle('⭐ stars added')
      .addFields({ name: 'user', value: target.tag, inline: true }, { name: 'added', value: `+${amount}`, inline: true }, { name: 'total', value: `${total}`, inline: true }).setTimestamp();
    interaction.reply({ embeds: [embed] });
    return logEmbed(guild, embed);
  }

  if (commandName === 'removestars') {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const total  = addStars(guild.id, target.id, -amount);
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFEE75C).setDescription(`⭐ removed **${amount}** stars from **${target.tag}**. they now have **${total}** ♡`)] });
  }

  if (commandName === 'warn') {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const count  = addWarning(guild.id, target.id, reason, user.tag);
    const embed  = new EmbedBuilder().setColor(0xFEE75C).setTitle('⚠️ member warned')
      .addFields({ name: 'user', value: target.user.tag, inline: true }, { name: 'moderator', value: user.tag, inline: true }, { name: 'reason', value: reason }, { name: 'total warnings', value: `${count}` }).setTimestamp();
    interaction.reply({ embeds: [embed] });
    target.user.send({ embeds: [embed] }).catch(() => {});
    return logEmbed(guild, embed);
  }

  if (commandName === 'warnings') {
    const target = interaction.options.getMember('user');
    const warns  = getWarnings(guild.id, target.id);
    if (!warns.length) return interaction.reply({ content: `✅ **${target.user.tag}** has no warnings.`, ephemeral: true });
    const list = warns.map((w, i) => `**${i + 1}.** ${w.reason} — by ${w.moderator} <t:${Math.floor(new Date(w.date).getTime() / 1000)}:R>`).join('\n');
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFEE75C).setTitle(`${target.user.username}'s warnings`).setDescription(list).setFooter({ text: `total: ${warns.length}` })], ephemeral: true });
  }

  if (commandName === 'clearwarnings') {
    const target = interaction.options.getMember('user');
    clearWarnings(guild.id, target.id);
    return interaction.reply({ content: `✅ Cleared all warnings for **${target.user.tag}**.`, ephemeral: true });
  }

  if (commandName === 'kick') {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    if (!target.kickable) return interaction.reply({ content: '❌ I cannot kick this user.', ephemeral: true });
    await target.kick(reason);
    const embed = modEmbed('🥾 member kicked', target.user, user, reason);
    interaction.reply({ embeds: [embed] });
    return logEmbed(guild, embed);
  }

  if (commandName === 'ban') {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    if (!target.bannable) return interaction.reply({ content: '❌ I cannot ban this user.', ephemeral: true });
    await target.ban({ reason });
    const embed = modEmbed('🔨 member banned', target.user, user, reason);
    interaction.reply({ embeds: [embed] });
    return logEmbed(guild, embed);
  }

  if (commandName === 'unban') {
    const id = interaction.options.getString('id');
    try {
      const u = await guild.members.unban(id);
      return interaction.reply({ content: `✅ Unbanned **${u.tag}**.`, ephemeral: true });
    } catch { return interaction.reply({ content: '❌ Could not find a ban for that ID.', ephemeral: true }); }
  }

  if (commandName === 'mute') {
    const target  = interaction.options.getMember('user');
    const minutes = interaction.options.getInteger('minutes');
    const reason  = interaction.options.getString('reason') || 'No reason provided';
    await target.timeout(minutes * 60 * 1000, reason);
    const embed = modEmbed(`🔇 member muted (${minutes}m)`, target.user, user, reason);
    interaction.reply({ embeds: [embed] });
    return logEmbed(guild, embed);
  }

  if (commandName === 'unmute') {
    const target = interaction.options.getMember('user');
    await target.timeout(null);
    return interaction.reply({ content: `✅ Unmuted **${target.user.tag}**.`, ephemeral: true });
  }

  if (commandName === 'purge') {
    const amount = interaction.options.getInteger('amount');
    if (amount < 1 || amount > 100) return interaction.reply({ content: '❌ Provide a number 1–100.', ephemeral: true });
    await interaction.reply({ content: `✅ Deleting **${amount}** messages...`, ephemeral: true });
    await interaction.channel.bulkDelete(amount, true);
    return;
  }

  if (commandName === 'announce') {
    const text = interaction.options.getString('message');
    const ch   = guild.channels.cache.get(ANNOUNCE_CHANNEL_ID);
    if (!ch) return interaction.reply({ content: '❌ announce channel not found.', ephemeral: true });
    await ch.send({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setTitle('📢 announcement').setDescription(text).setFooter({ text: `announced by ${user.tag}` }).setTimestamp()] });
    return interaction.reply({ content: '✅ Announcement sent!', ephemeral: true });
  }

  if (commandName === 'lockdown') {
    guild.channels.cache.filter(c => c.type === ChannelType.GuildText).forEach(ch => ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }).catch(() => {}));
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('🔒 server locked down.').setTimestamp()] });
  }

  if (commandName === 'unlockdown') {
    guild.channels.cache.filter(c => c.type === ChannelType.GuildText).forEach(ch => ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null }).catch(() => {}));
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription('🔓 server unlocked ♡').setTimestamp()] });
  }

  if (commandName === 'setup') {
    await postRules(guild);
    await postTicketPanel(guild);
    return interaction.reply({ content: '✅ Rules & ticket panel updated!', ephemeral: true });
  }
});

// ─── Member join ──────────────────────────────────────────────────────────────
client.on('guildMemberAdd', async (member) => {
  await checkRaid(member);

  const welcomeCh = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  const introCh   = member.guild.channels.cache.find(c => c.name === 'intro');
  if (welcomeCh) welcomeCh.send({
    embeds: [
      new EmbedBuilder().setColor(0x2b2d31).setTitle(`welcome to ${SERVER_NAME} ✦`)
        .setDescription(`hey ${member}, glad you're here! ♡\n\n↳ read the rules in <#${RULES_CHANNEL_ID}>\n${introCh ? `↳ introduce yourself in <#${introCh.id}>` : ''}`)
        .setImage(RULES_IMAGE_URL).setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `member #${member.guild.memberCount}` }).setTimestamp(),
    ],
  });
});

// ─── Member leave ─────────────────────────────────────────────────────────────
client.on('guildMemberRemove', async (member) => {
  const ch = member.guild.channels.cache.get(GOODBYE_CHANNEL_ID);
  if (!ch) return;
  ch.send({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`**${member.user.tag}** has left ${SERVER_NAME}. we'll miss them ♡`).setThumbnail(member.user.displayAvatarURL({ dynamic: true })).setTimestamp()] });
});

// ─── Booster role auto-assign ─────────────────────────────────────────────────
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  const wasBooster = oldMember.premiumSince;
  const isBooster  = newMember.premiumSince;

  if (!wasBooster && isBooster) {
    // Just started boosting
    await newMember.roles.add(BOOSTER_ROLE_ID).catch(() => {});
    const ch = newMember.guild.channels.cache.get(BOOST_ANNOUNCE_ID);
    if (ch) ch.send({
      embeds: [
        new EmbedBuilder().setColor(0xFF73FA).setTitle('💜 new booster!')
          .setDescription(`thank you **${newMember.user.tag}** for boosting **${SERVER_NAME}**! ♡\nyou've been given the booster role 🎀`)
          .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: `${SERVER_NAME} ♡` }).setTimestamp(),
      ],
    });
  }

  if (wasBooster && !isBooster) {
    // Stopped boosting
    await newMember.roles.remove(BOOSTER_ROLE_ID).catch(() => {});
  }
});

// ─── Messages (auto-mod + XP + owner ping reply) ──────────────────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // Owner ping reply
  if (message.content.includes(`<@${OWNER_USER_ID}>`)) {
    return message.reply('You can do it yourself.');
  }

  const isStaff = message.member?.permissions.has(PermissionFlagsBits.ModerateMembers);

  if (!isStaff) {
    // Blacklisted words
    if (containsBlacklisted(message.content)) {
      await message.delete().catch(() => {});
      const count = addWarning(message.guild.id, message.author.id, 'Used blacklisted word', 'Auto-mod');
      const reply = await message.channel.send({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription(`❌ ${message.author} that word is not allowed here. **(warning ${count})**`).setTimestamp()] });
      setTimeout(() => reply.delete().catch(() => {}), 5000);
      logEmbed(message.guild, new EmbedBuilder().setColor(0xED4245).setTitle('🤬 Blacklisted Word')
        .addFields({ name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true }, { name: 'Channel', value: `<#${message.channel.id}>`, inline: true }, { name: 'Warnings', value: `${count}`, inline: true }).setTimestamp());
      return;
    }

    // Anti-spam
    const spammed = await checkSpam(message);
    if (spammed) return;
  }

  // XP
  const key = `${message.guild.id}-${message.author.id}`;
  if (!xpCooldowns.has(key)) {
    xpCooldowns.set(key, true);
    setTimeout(() => xpCooldowns.delete(key), XP_COOLDOWN);
    const { level, leveledUp } = addXP(message.guild.id, message.author.id);
    if (leveledUp) {
      const msg = await message.channel.send({ embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`✨ ${message.author} just reached **level ${level}**! ♡`).setTimestamp()] });
      setTimeout(() => msg.delete().catch(() => {}), 10000);
    }
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function modEmbed(title, targetUser, moderator, reason) {
  return new EmbedBuilder().setColor(0x2b2d31).setTitle(title)
    .addFields({ name: 'user', value: `${targetUser.tag} (${targetUser.id})`, inline: true }, { name: 'moderator', value: moderator.tag, inline: true }, { name: 'reason', value: reason })
    .setTimestamp();
}

client.login(process.env.DISCORD_TOKEN);
