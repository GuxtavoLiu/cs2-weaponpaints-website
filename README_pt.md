<p align="center">
    <a href="README.md"><img src="https://img.shields.io/badge/LANG-ENGLISH-blue"></a>
    <a href="README_pt.md"><img src="https://img.shields.io/badge/IDIOMA-PORTUGU%C3%8AS-yellow"></a>
    <a href="README_cn.md"><img src="https://img.shields.io/badge/语言-简体中文-red"></a>
    <img src="https://img.shields.io/badge/license-GPL--3.0-green">
    <img src="https://img.shields.io/badge/node-%E2%89%A517-brightgreen">
</p>

# CS2 WeaponPaints Website

Uma interface web para o plugin [**cs2-WeaponPaints**](https://github.com/Nereziel/cs2-WeaponPaints/). Ela permite que jogadores do seu servidor comunitário de CS2 façam login com a Steam e personalizem seu loadout - skins de armas, facas, luvas, agentes, music kits e adesivos - que o plugin então aplica dentro do jogo.

Este é um **fork modificado** de [SwaggyMacro/cs2-WeaponPaints-Website](https://github.com/SwaggyMacro/cs2-WeaponPaints-Website), que por sua vez é baseado no projeto original [L1teD/cs2-WeaponPaints-website](https://github.com/L1teD/cs2-WeaponPaints-website). Veja os [Créditos](#créditos).

> [!WARNING]
> Plugins que permitem aos jogadores usar skins que não possuem ficam numa área cinzenta das regras da Valve. Rodar o plugin subjacente num servidor público **pode levar a um banimento de GSLT/Steam**. Use por sua conta e risco e leia as [diretrizes de servidor da Valve](https://store.steampowered.com/gameserverterms/). Este repositório é apenas o site (UI) - ele não inclui nenhum código de jogo.

## Funcionalidades

Tudo o que vem dos projetos originais (seleção de arma / faca / luva / agente / music kit, troca de luva e music kit, otimização de requisições, interface multilíngue) **mais** as adições deste fork:

- **Visão geral do loadout** - uma única tela mostrando todo o seu loadout, com alternância entre padrão/todos; luvas equipadas são renderizadas corretamente e facas/luvas vão direto para o seletor completo.
- **Adesivos** - seleção de adesivos por arma (slots + controle de desgaste), um modal grande de escolha de adesivos com filtros de tipo / efeito / raridade e busca elástica por tokens, além de um atalho "aplicar a todos".
- **Aplicar link de inspeção** - cole um link de inspeção do CS2 e o float, o pattern e os adesivos são decodificados **offline** (decodificação de link mascarado) e preenchidos automaticamente.
- **Editor de float / pattern** - controle de desgaste com presets rápidos, entrada de pattern, e o float/pattern salvo é pré-preenchido ao reabrir uma skin.
- **Alternância de StatTrak** (ativada por padrão nos itens aplicáveis).
- **Qualidade de vida** - cursor de ponteiro em elementos clicáveis e layout responsivo para celular.

## Idiomas

`en` · `pt-BR` · `ru` · `zh-CN` (veja `src/lang/`). Defina o idioma ativo pelo campo `lang` na sua configuração.

## Capturas de tela

<div>
    <img src="/previews/loadout.png?raw=true" width="400">
    <img src="/previews/knives.png?raw=true" width="400">
    <img src="/previews/float-pattern.png?raw=true" width="400">
</div>

## Requisitos

- **Node.js 17+** (o 16 também funciona).
- Um banco de dados **MySQL** compartilhado com o plugin [cs2-WeaponPaints](https://github.com/Nereziel/cs2-WeaponPaints/).
- Uma [**chave da Steam Web API**](https://steamcommunity.com/dev/apikey).

## Instalação

1. Clone este repositório.
2. Copie `src/config.example.json` para `src/config.json` e preencha (veja [Configuração](#configuração)).
3. Instale as dependências e inicie:

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

   Para desenvolvimento com recarregamento automático: `npm run dev`.

O site roda em `http://<HOST>:<PORT>` (porta padrão `27075`).

## Configuração

`src/config.json`:

| Campo | Descrição |
|-------|-------------|
| `name` | Título exibido no cabeçalho do site / aba. |
| `lang` | Idioma da interface: `en`, `pt-BR`, `ru` ou `zh-CN`. |
| `DB.DB_HOST` | Host do MySQL. |
| `DB.DB_USER` | Usuário do MySQL. |
| `DB.DB_PASS` | Senha do MySQL. |
| `DB.DB_DB` | Nome do banco de dados (o mesmo usado pelo plugin). |
| `DB.DB_PORT` | Porta do MySQL (normalmente `3306`). |
| `HOST` | Host público ou `localhost` / `127.0.0.1`. |
| `PROTOCOL` | `http` ou `https` (usado para montar a URL de retorno da Steam). |
| `PORT` | Porta em que o site escuta. |
| `STEAMAPIKEY` | Sua chave da Steam Web API. |
| `secret` | *Opcional.* String aleatória longa usada para assinar os cookies de sessão. Se omitida, um novo segredo aleatório é gerado a cada reinício (o que desloga todo mundo ao reiniciar). |
| `connect.show` | `true`/`false` - mostra um botão "Conectar ao servidor". |
| `connect.url` | URL `steam://connect/...` desse botão. |

> Nota: o site é servido a partir do caminho raiz (`/`). Hospedagem em subdiretório não é configurável neste fork.

## Créditos

- Projeto original: [**@L1teD**](https://github.com/L1teD/cs2-WeaponPaints-website)
- Fork de origem: [**@SwaggyMacro**](https://github.com/SwaggyMacro/cs2-WeaponPaints-Website)
- Plugin de jogo: [**cs2-WeaponPaints** por @Nereziel](https://github.com/Nereziel/cs2-WeaponPaints/)

## Licença

Licenciado sob a **GNU GPL-3.0** - veja o arquivo [LICENSE](LICENSE).
