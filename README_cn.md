<p align="center">
    <a href="README.md"><img src="https://img.shields.io/badge/LANG-ENGLISH-blue"></a>
    <a href="README_pt.md"><img src="https://img.shields.io/badge/IDIOMA-PORTUGU%C3%8AS-yellow"></a>
    <a href="README_cn.md"><img src="https://img.shields.io/badge/语言-简体中文-red"></a>
    <img src="https://img.shields.io/badge/license-GPL--3.0-green">
    <img src="https://img.shields.io/badge/node-%E2%89%A517-brightgreen">
</p>

# CS2 WeaponPaints 网站

[**cs2-WeaponPaints**](https://github.com/Nereziel/cs2-WeaponPaints/) 插件的网页前端。玩家可以在你的 CS2 社区服务器上通过 Steam 登录，自定义自己的配装 —— 武器皮肤、刀、手套、探员、音乐盒和印花 —— 然后由插件在游戏内应用。

本项目是 [SwaggyMacro/cs2-WeaponPaints-Website](https://github.com/SwaggyMacro/cs2-WeaponPaints-Website) 的**修改版分支**，而后者又基于原始项目 [L1teD/cs2-WeaponPaints-website](https://github.com/L1teD/cs2-WeaponPaints-website)。详见[致谢](#致谢)。

> [!WARNING]
> 让玩家使用并不拥有的皮肤的插件，处于 Valve 规则的灰色地带。在公开服务器上运行底层插件**可能导致 GSLT / Steam 封禁**。请自担风险，并阅读 [Valve 服务器条款](https://store.steampowered.com/gameserverterms/)。本仓库仅包含网站（UI），不含任何游戏端代码。

## 功能

包含上游项目的全部功能（武器 / 刀 / 手套 / 探员 / 音乐盒选择、手套与音乐盒更换、请求优化、多语言界面），**并新增**本分支的以下内容：

- **配装总览** —— 在单一界面查看完整配装，带默认/全部切换；已装备手套正确渲染，刀和手套可直接跳转到完整选择器。
- **印花** —— 每件武器的印花选择（槽位 + 磨损滑块），带类型 / 效果 / 稀有度筛选和弹性分词搜索的大型印花选择弹窗，以及"应用到全部"快捷操作。
- **应用检视链接** —— 粘贴 CS2 检视链接，**离线**解码（掩码链接解码）出磨损度、图案和印花并自动填入。
- **磨损 / 图案编辑器** —— 磨损滑块与快捷预设、图案输入，重新打开皮肤时自动填入已保存的磨损/图案。
- **StatTrak 开关**（适用物品默认开启）。
- **体验优化** —— 可点击元素显示指针光标，以及移动端自适应布局。

## 语言

`en` · `pt-BR` · `ru` · `zh-CN`（见 `src/lang/`）。通过配置中的 `lang` 字段设置当前语言。

## 截图

<div>
    <img src="/previews/loadout.png?raw=true" width="400">
    <img src="/previews/knives.png?raw=true" width="400">
    <img src="/previews/float-pattern.png?raw=true" width="400">
</div>

## 环境要求

- **Node.js 17+**（16 也可用）。
- 与 [cs2-WeaponPaints](https://github.com/Nereziel/cs2-WeaponPaints/) 插件共享的 **MySQL** 数据库。
- 一个 [**Steam Web API Key**](https://steamcommunity.com/dev/apikey)。

## 安装

1. 克隆本仓库。
2. 将 `src/config.example.json` 复制为 `src/config.json` 并填写（见[配置](#配置)）。
3. 安装依赖并启动：

   **Windows**
   ```bash
   npm i
   npm run start
   ```

   **Linux**
   ```bash
   npm i
   npm run startLinux
   ```

   开发模式（自动重载）：`npm run dev`。

网站运行在 `http://<HOST>:<PORT>`（默认端口 `27075`）。

## 配置

`src/config.json`：

| 字段 | 说明 |
|-------|-------------|
| `name` | 显示在站点标题 / 标签页的名称。 |
| `lang` | 界面语言：`en`、`pt-BR`、`ru` 或 `zh-CN`。 |
| `DB.DB_HOST` | MySQL 主机。 |
| `DB.DB_USER` | MySQL 用户。 |
| `DB.DB_PASS` | MySQL 密码。 |
| `DB.DB_DB` | 数据库名（插件所用的那个）。 |
| `DB.DB_PORT` | MySQL 端口（通常为 `3306`）。 |
| `HOST` | 公网主机或 `localhost` / `127.0.0.1`。 |
| `PROTOCOL` | `http` 或 `https`（用于构建 Steam 回调 URL）。 |
| `PORT` | 网站监听的端口。 |
| `STEAMAPIKEY` | 你的 Steam Web API Key。 |
| `secret` | *可选。* 用于签名会话 Cookie 的长随机字符串。若省略，每次重启会生成新的随机密钥（重启后所有人会被登出）。 |
| `connect.show` | `true`/`false` —— 是否显示"连接到服务器"按钮。 |
| `connect.url` | 该按钮的 `steam://connect/...` 链接。 |

> 注意：网站从根路径（`/`）提供服务。本分支不支持子目录部署。

## 致谢

- 原始项目：[**@L1teD**](https://github.com/L1teD/cs2-WeaponPaints-website)
- 上游分支：[**@SwaggyMacro**](https://github.com/SwaggyMacro/cs2-WeaponPaints-Website)
- 游戏插件：[**cs2-WeaponPaints** by @Nereziel](https://github.com/Nereziel/cs2-WeaponPaints/)

## 许可证

基于 **GNU GPL-3.0** 授权 —— 详见 [LICENSE](LICENSE) 文件。
