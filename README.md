# AgriLink Investor Vision

VOU DEIXAR O LOGTIPO EM AEXO E TAMBE GERE DOCUEMNTOS EM PDF PARA A DEMOSTRACAO:Cria uma plataforma web para a AgriLink — um marketplace agrícola em Angola que liga produtores a compradores, com transporte até Luanda e pagamento via mobile money (Unitel Money/Afrimoney). A plataforma serve para APRESENTAR o modelo financeiro e os fluxos de receita da empresa a investidores, de forma visual, profissional e interativa — não é uma ferramenta de contabilidade interna.

## Objetivo

Um dashboard de "investor demo" que conta a história financeira da AgriLink: de onde vem a receita, como o dinheiro flui entre produtor, comprador, motorista e AgriLink, e qual é a projeção de crescimento. Deve parecer uma mistura de pitch deck interativo + spreadsheet editável, para o fundador poder ajustar números ao vivo numa reunião com investidores.

## Estrutura da plataforma

### 1. Landing / Overview (primeira página)

- Logo AgriLink, tagline curta

- 3-4 KPIs principais em destaque (ex: Volume transacionado, Nº de produtores, Nº de caixas/mês, Receita mensal) — com inputs editáveis para simular cenários

- Navegação lateral para as secções abaixo

### 2. Fluxo de Receita (Revenue Streams)

Baseado nas 3 fontes de receita da AgriLink:

- Comissão sobre venda formal (contratos com compradores formais/futuros)

- Comissão fixa por caixa/corredor no transporte

- Comissão sobre o volume pago via Unitel Money / Afrimoney / EMIS

Mostrar cada fonte como um cartão com: % ou valor da comissão (editável), volume estimado (editável), receita resultante (calculada automaticamente). Gráfico de barras/pizza a mostrar o peso de cada fonte no total.

### 3. Fluxo de Dinheiro (Money Flow) — visual tipo diagrama

Diagrama animado/interativo mostrando o percurso do dinheiro:

Comprador paga → AgriLink recebe/retém comissão → transferência automática para carteira móvel do produtor → motorista recebe frete → produtor levanta em agente Unitel/Afrimoney

Cada etapa com o valor a fluir e a comissão retida visível. Pode ser um diagrama Sankey ou um flowchart horizontal com setas, similar ao infográfico "Fluxo de Logística e Pagamento" que a empresa já usa internamente (etapas: publicação → pagamento → recolha → chegada a Luanda → transferência automática → SMS → levantamento no agente).

### 4. Plano Financeiro estilo Excel (grelha editável)

- Tabela mensal/anual editável (linhas: Receitas por fonte, Custos — comissões a motoristas e operadoras, operação dos pontos de agregação, equipa financeira —, Margem, Fluxo de Caixa acumulado)

- Fórmulas automáticas (totais, margens, crescimento mês a mês)

- Formatação em Kwanza (Kz / AOA)

- Alternar entre vista de tabela e vista de gráfico (evolução da receita, custos e margem ao longo do tempo)

- Cenários pré-configurados: Conservador / Base / Otimista (toggle que recalcula tudo)

### 5. Estrutura de Custos

Cartões visuais para: comissões a motoristas e a Unitel Money/Afrimoney por transação, operação dos pontos de agregação (Mangueirinhas, Estalagem, Congoleses), equipa financeira dedicada. Cada um com valor estimado editável.

### 6. Segmentos e Parcerias-Chave (contexto para investidores)

Secção mais leve/visual: cartões com os parceiros-chave (Unitel Money, Afrimoney, EMIS/Multicaixa Express, TotalEnergies Angola) e os segmentos de clientes (produtores, compradores formais, compradores informais, motoristas).

### 7. Modo Apresentação

Botão "Modo Investidor" que esconde controlos de edição, aumenta o tamanho da fonte e navega em ecrã cheio slide a slide (como um pitch deck), reaproveitando os dados já inseridos nas secções anteriores.

## Funcionalidades técnicas

- Todos os números-chave devem ser editáveis inline e recalcular automaticamente (efeito spreadsheet)

- Guardar cenários (Conservador/Base/Otimista) com persistência entre sessões

- Exportar a vista atual para PDF (para enviar a investidores) e os dados da grelha para Excel (.xlsx)

- Design profissional, verde AgriLink (identidade visual: verde escuro #1a4d2e ou similar, fundo branco/cinza claro), tipografia limpa, inspirado em pitch decks de startups agrotech

- Totalmente responsivo, mas otimizado para apresentação em ecrã grande/projetor

## Ordem de construção sugerida

1. Estrutura base + navegação + KPIs editáveis na overview

2. Fluxo de receita com cálculos automáticos

3. Diagrama de fluxo de dinheiro

4. Grelha financeira estilo Excel com cenários

5. Modo apresentação e exportação

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://investor-agro-story.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8ae49f18-d984-4b5f-8925-420480ece579).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
