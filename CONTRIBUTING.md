# Como contribuir com o Meu Bolso

Obrigado pelo interesse em contribuir! Este documento explica como o projeto é
licenciado, o que você precisa aceitar antes de ter um pull request aceito e
como preparar a sua contribuição.

## Licenciamento

O Meu Bolso é distribuído sob a **GNU Affero General Public License v3.0**
(AGPL-3.0-only). O texto completo está em [`LICENSE`](./LICENSE).

Em resumo, qualquer pessoa pode usar, estudar, modificar e redistribuir o
projeto, inclusive comercialmente, **desde que publique o código-fonte completo
de todas as alterações sob a mesma licença**. Isso vale também para quem
oferece uma versão modificada para usuários pela rede (ex.: hospedada como
serviço), conforme a seção 13 da AGPL.

O titular dos direitos autorais, **Matheus Caldeira**, também pode oferecer o
Meu Bolso sob **licença comercial** separada (licenciamento duplo). É por isso
que as contribuições externas exigem o aceite do Acordo de Licença de
Contribuidor abaixo.

### Marca

A licença cobre o código, não a marca. O nome **"Meu Bolso"**, o logotipo e a
identidade visual não são licenciados pela AGPL. Forks devem usar outro nome e
outra identidade visual.

## Acordo de Licença de Contribuidor (CLA)

Ao enviar uma contribuição (código, documentação, imagens ou qualquer outro
material) para este repositório, você ("Contribuidor") concorda com os termos
a seguir em favor de Matheus Caldeira ("Mantenedor").

1. **Autoria.** Você declara que a contribuição é de sua autoria original ou
   que tem o direito de enviá-la nestes termos. Se ela foi criada no contexto
   de um emprego ou contrato, você declara ter autorização do seu empregador ou
   contratante para fazê-lo.
2. **Você mantém os direitos autorais.** Este acordo **não** transfere a
   titularidade dos direitos autorais. Você continua dono da sua contribuição e
   pode usá-la como quiser.
3. **Licença de direitos autorais.** Você concede ao Mantenedor uma licença
   perpétua, mundial, não exclusiva, gratuita, irrevogável e sublicenciável para
   reproduzir, modificar, preparar obras derivadas, exibir, executar,
   sublicenciar e distribuir a contribuição e suas obras derivadas, **sob
   quaisquer termos, inclusive licenças comerciais e proprietárias**.
4. **Licença de patentes.** Você concede ao Mantenedor, e a quem receber o
   software dele, uma licença perpétua, mundial, não exclusiva, gratuita e
   irrevogável sobre quaisquer patentes suas que sejam necessariamente
   infringidas pela contribuição, isoladamente ou combinada com o projeto.
5. **Compromisso com o código aberto.** Em contrapartida, o Mantenedor se
   compromete a manter toda contribuição aceita disponível também sob a
   AGPL-3.0 ou outra licença aprovada pela Open Source Initiative.
6. **Sem garantias.** A contribuição é fornecida "no estado em que se
   encontra", sem garantias de qualquer tipo, e você não tem obrigação de
   oferecer suporte a ela.
7. **Informações incorretas.** Você se compromete a avisar o Mantenedor caso
   descubra que alguma declaração acima deixou de ser verdadeira.

### Como aceitar

No seu **primeiro pull request**, inclua na descrição a frase abaixo,
exatamente como está:

> Li e concordo com o Acordo de Licença de Contribuidor descrito no
> CONTRIBUTING.md deste repositório.

Pull requests sem esse aceite não serão mesclados. O aceite vale para todas as
suas contribuições futuras neste repositório.

## Preparando a contribuição

### Ambiente

```bash
npm install
npm run dev
```

Em desenvolvimento:

- Landing: http://localhost:5173/
- App: http://localhost:5173/meu-bolso/app/
- Documentação: http://localhost:5173/meu-bolso/docs/

### Regras do projeto

- **Arquitetura em camadas (DDD):** a UI nunca fala com o banco. Ela chama use
  cases em `src/application/`, que usam repositórios via Unit of Work. Detalhes
  em [`docs/architecture.md`](./docs/architecture.md).
- **Erros com `Either`:** operações que podem falhar retornam `Either`, sem
  `throw` no fluxo de negócio.
- **UI em atomic design** sobre os tokens do design system. Nada de cores
  `#hex` ou valores arbitrários em componentes. Ver
  [`docs/atomic-design.md`](./docs/atomic-design.md) e
  [`docs/design-system.md`](./docs/design-system.md).
- **Código em inglês, textos para o usuário em português** (com acentuação
  correta).
- **Sem comentários no código:** prefira nomes claros e funções pequenas.
- **Testes obrigatórios, cobertura 100%:** todo código novo entra com seus
  testes.

### Antes de abrir o pull request

Rode e deixe tudo verde:

```bash
npm run check   # format + lint + testes com cobertura
npm run build   # garante que o TypeScript e o build de produção passam
```

### Pull requests

- Abra o PR a partir de uma branch própria, nunca direto na `main`.
- Descreva o problema resolvido e como testar.
- Mensagens de commit em português, no formato
  [Conventional Commits](https://www.conventionalcommits.org/pt-br/)
  (ex.: `feat(caixa): ...`, `fix(comandas): ...`).
- Mantenha o PR focado em uma única mudança.

## Dúvidas

Abra uma issue no repositório.
