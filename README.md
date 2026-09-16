<div align="center">

# ChatGPT Usage Monitor

### Extensao Chrome para monitorar uso do ChatGPT Plus

[![LGPD](https://img.shields.io/badge/LGPD-Compliant-green?style=for-the-badge)](#lgpd)
[![Privacy](https://img.shields.io/badge/Privacidade-100%25%20Local-blue?style=for-the-badge)](#privacidade)
[![Chrome](https://img.shields.io/badge/Chrome-Extension-orange?style=for-the-badge)](#instalacao)

---

</div>

## O que e?

Uma extensao Chrome leve e segura que monitora automaticamente seu uso do ChatGPT Plus, exibindo:

- **Limite de 5 horas** - Controle de mensagens por sessao
- **Limite semanal** - Controle de uso total na semana
- **Badge visual** - Percentual de uso na barra de ferramentas
- **Reset timer** - Countdown ate o proximo reset

---

## Funcionalidades

| Recurso | Descricao |
|---------|-----------|
| Badge em tempo real | Mostra % de uso na barra de ferramentas |
| Reset timer | Countdown ate o proximo reset |
| Cores indicativas | Verde (baixo), amarelo (medio), vermelho (alto) |
| Auto-refresh | Atualiza a cada 5 minutos |
| Tema claro/escuro | Opcao de alternancia |
| Dados locais | Nada sai do seu computador |

---

## Instalacao

### Passo 1: Baixe o Projeto

```bash
git clone https://github.com/USUARIO/UsoGPT.git
cd UsoGPT
```

Ou faca download do ZIP e extraia.

### Passo 2: Abra o Chrome

1. Digite `chrome://extensions` na barra de endereco
2. Ative **Modo desenvolvedor** (canto superior direito)
3. Clique em **Carregar extensao descompactada**
4. Selecione a pasta `extension/` deste projeto

### Passo 3: Configure

1. Clique no icone da extensao (barra de ferramentas)
2. Clique em Configuracoes
3. Escolha qual metrica mostrar no badge:
   - **5-Hour**: Limite de 5 horas
   - **7-Day**: Limite semanal

### Passo 4: Use

1. Acesse [chatgpt.com](https://chatgpt.com)
2. Faca login na sua conta
3. O badge mostrara seu uso automaticamente
4. Clique no icone para ver detalhes

---

## Estrutura do Projeto

```
UsoGPT/
├── extension/
│   ├── manifest.json      # Configuracao da extensao
│   ├── background.js      # Service worker
│   ├── popup.html         # Interface da extensao
│   ├── popup.js           # Logica da extensao
│   ├── styles.css         # Estilos da extensao
│   └── icons/             # Icones (16, 48, 128px)
├── README.md              # Esta documentacao
└── .gitignore             # Arquivos ignorados pelo Git
```

---

## Privacidade e LGPD

### Compromisso com seus dados

- Nenhum dado sai do seu computador
- Sem analytics ou tracking
- Sem envio para servidores externos
- Armazenamento local (Chrome Storage)
- Opcao de deletar todos os dados
- Dados mantidos por apenas 30 dias

### O que NAO coletamos

- Senhas ou credenciais
- Conteudo de conversas
- Dados de navegacao
- Informacoes pessoais identificaveis

### O que coletamos (apenas localmente)

- Percentual de uso de cotas
- Timestamps de medicoes
- Tipo de plano (Plus, Free, etc.)

---

## Como Funciona

### Endpoints Utilizados

A extensao utiliza endpoints oficiais da OpenAI:

```
GET https://chatgpt.com/backend-api/wham/usage
Authorization: Bearer <token da sessao>
```

### Dados Coletados

```json
{
  "plan_type": "plus",
  "rate_limit": {
    "primary_window": {
      "used_percent": 45,
      "limit_window_seconds": 18000,
      "reset_at": 1234567890
    },
    "secondary_window": {
      "used_percent": 30,
      "limit_window_seconds": 604800,
      "reset_at": 1234567890
    }
  }
}
```

---

## Configuracao

### Alterar Intervalo de Atualizacao

Edite `extension/background.js`:

```javascript
const POLL_INTERVAL = 5; // minutos
```

### Alterar Metrica do Badge

1. Clique no icone da extensao
2. Va em Configuracoes
3. Selecione a metrica desejada

---

## Solucao de Problemas

### Badge nao aparece

1. Verifique se esta logado em chatgpt.com
2. Recarregue a pagina
3. Clique no icone da extensao e em "Atualizar"

### Dados nao atualizam

1. Verifique sua conexao com a internet
2. Abra o console (F12) e procure erros
3. Recarregue a extensao

### Erro de autenticacao

1. Faca logout do chatgpt.com
2. Faca login novamente
3. Recarregue a pagina

---

## Compatibilidade

| Navegador | Suporte |
|-----------|---------|
| Chrome | Completo |
| Edge | Completo |
| Brave | Completo |
| Arc | Completo |
| Firefox | Parcial |

---

## Licenca

Este projeto esta sob a licença MIT.

---

## Contribuindo

Contribuicoes sao bem-vindas!

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudancas (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

---

## Agradecimentos

- [ChatGPT Usage Tracker](https://github.com/mikebutash/openai-codex-usage-chrome) - Inspiracao para extensao

---

<div align="center">

### Se este projeto foi util, deixe uma estrela!

</div>