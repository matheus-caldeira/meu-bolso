# SheetJS (xlsx) — dependência vendorizada

Biblioteca de leitura e escrita de planilhas, usada para exportar os relatórios
em `.xlsx`.

## Por que está aqui e não no `package.json`

O pacote `xlsx` deixou de ser publicado no npm em 2023. O que restou no registro
público é a versão `0.18.5`, sem manutenção e com vulnerabilidades conhecidas
(prototype pollution, ReDoS). A distribuição oficial passou a ser o CDN próprio
da SheetJS, e apontar uma URL externa no `package.json` deixaria o build
dependente da disponibilidade desse CDN.

Vendorizar resolve os dois problemas: a versão é atual e o build não depende de
rede.

## Procedência

| | |
| --- | --- |
| Versão | 0.20.3 |
| Origem | `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` |
| SHA-256 do tarball | `8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8` |
| Licença | Apache-2.0 (ver `LICENSE`) |
| Baixado em | 2026-09-10 |

## Conteúdo

- `xlsx.mjs` — build ESM, o entry point declarado em `"module"` pelo pacote
- `types/` — tipagens oficiais
- `LICENSE` — Apache-2.0

## Como atualizar

```bash
curl -o xlsx.tgz https://cdn.sheetjs.com/xlsx-<versão>/xlsx-<versão>.tgz
shasum -a 256 xlsx.tgz
tar xzf xlsx.tgz
cp package/xlsx.mjs package/LICENSE src/vendor/xlsx/
cp -r package/types src/vendor/xlsx/types
```

Atualize a tabela de procedência acima com a versão e o hash novos.
