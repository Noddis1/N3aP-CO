const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require("discord.js");
// =============================================
// CONFIG - fetched from your BotForge Panel
// =============================================
const CLIENT_ID = "1494370637777473748"; // From Discord Dev Portal
const GUILD_ID = "1481739027488182354";
const PANEL_API = "https://api.base44.com/api/apps/preview--evasive-discord-command-hub/entities/BotCommand";

// =============================================
// FETCH COMMANDS FROM BOTFORGE PANEL
// =============================================
async function fetchCommands() {
  const res = await fetch(PANEL_API, {
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer botforge2024"
  }
});

  if (!res.ok) {
    console.log("API ERROR:", await res.text());
    return [];
  }

  let data;
  try {
    data = await res.json();
  } catch (err) {
    console.log("NOT JSON:", await res.text());
    return [];
  }

  return data.filter(cmd => cmd.is_enabled !== false);
}

// =============================================
// REGISTER SLASH COMMANDS WITH DISCORD
// =============================================
async function registerSlashCommands(commands) {
  const rest = new REST().setToken(process.env.TOKEN);
  const slashCmds = commands
    .filter(cmd => cmd.command_type === "slash" || cmd.command_type === "both")
    .map(cmd => new SlashCommandBuilder()
      .setName(cmd.name.toLowerCase().replace(/\s+/g, "-"))
      .setDescription(cmd.description || "No description")
      .toJSON()
    );

  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: slashCmds });
  console.log(`✅ Registered ${slashCmds.length} slash commands`);
}

// =============================================
// BOT MAIN LOGIC
// =============================================
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

let panelCommands = [];

client.once("ready", async () => {
  console.log(`🤖 ${client.user.tag} is online!`);
  panelCommands = await fetchCommands();
  await registerSlashCommands(panelCommands);

  // Set bot status from panel config
  client.user.setPresence({
    status: "online",
    activities: [{ name: "!corehelp", type: 0 }]
  });

  // Refresh commands from panel every 5 minutes
  setInterval(async () => {
    panelCommands = await fetchCommands();
    console.log("🔄 Commands refreshed from BotForge Panel");
  }, 5 * 60 * 1000);
});

// Handle slash commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = panelCommands.find(c => c.name.toLowerCase().replace(/\s+/g, "-") === interaction.commandName);
  if (cmd) {
    await interaction.reply(cmd.response || "Command executed!");
  }
});

// Handle prefix commands
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const prefix = "!fix";
  if (!message.content.startsWith(prefix)) return;
  const cmdName = message.content.slice(prefix.length).trim().split(" ")[0].toLowerCase();
  const cmd = panelCommands.find(c =>
    (c.command_type === "prefix" || c.command_type === "both") &&
    c.name.toLowerCase() === cmdName
  );
  if (cmd) {
    message.reply(cmd.response || "Command executed!");
  }
});

client.login(process.env.TOKEN);
