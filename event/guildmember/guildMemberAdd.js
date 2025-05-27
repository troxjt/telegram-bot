const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "guildMemberAdd",
	once: false,
	async execute(member, client) {

        const welcomeEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Cung cấp thiết bị, tài nguyên MMO')
            .setDescription(`Chào mừng ${member} đã tham gia!`)
            .addFields(
                { name: 'Thông báo', value: `<#1376454874446823518>`, inline: true },
                { name: 'Quy định', value: `<#1376767243647451198>`, inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL())
            // .setImage(client.config.Info.Image)
            .setFooter({ text: 'Chúc bạn có thời gian vui vẻ!', iconURL: member.guild.iconURL() })
            .setTimestamp();

        const channel = member.guild.channels.cache.get('1376766900029095936');
        if (channel) {
            channel.send({ embeds: [welcomeEmbed] });
        }
    },
};
