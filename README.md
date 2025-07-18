# Visionbel

Visionbel é uma aplicação de captura de tela e OCR que permite extrair e processar texto de imagens usando tecnologias modernas.

## Recursos

- Captura de tela com atalho global
- OCR (Reconhecimento Óptico de Caracteres)
- Processamento de texto com IA
- Interface moderna com Electron
- Estilização com Tailwind CSS
- Armazenamento local com SQLite

## Requisitos

- Node.js (versão 14 ou superior)
- NPM (Node Package Manager)

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/Visionbel.git
cd Visionbel
```

2. Instale as dependências:
```bash
npm install electron --save-dev
npm install node-key-sender
npm install @google/generative-ai
npm install tesseract.js
npm install sqlite3
npm install -D tailwindcss@3.4.1 postcss@8.4.35 autoprefixer@10.4.17
npm install electron-store
```

## Como Usar

1. Inicie a aplicação:
```bash
npm start
```

2. Use o atalho global `Ctrl+Shift+X` (ou `Cmd+Shift+X` no macOS) para capturar uma área da tela.

3. O texto será automaticamente extraído e processado.

## Como Contribuir

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Faça commit das suas alterações (`git commit -am 'Adiciona nova funcionalidade'`)
4. Faça push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

### Diretrizes de Contribuição

- Mantenha o código limpo e bem documentado
- Siga os padrões de código existentes
- Escreva testes para novas funcionalidades
- Atualize a documentação quando necessário

## Estrutura do Projeto