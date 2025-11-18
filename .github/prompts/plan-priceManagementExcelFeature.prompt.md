## Plan: Gerenciamento de Serviços e Preços com Interface Excel

Sistema completo para listar, editar e exportar serviços com editor de preços em estilo planilha Excel, incluindo suporte a ambientes (HML/PRD) e preços por estado brasileiro.

### Steps

1. **Criar estrutura de dados e API REST para serviços** — Adicionar endpoints em [`index.js`](index.js): `GET /services`, `GET /services/:id`, `PUT /services/:id` para gerenciar documentos da collection `services` no Firestore com estrutura contendo categoria, código, edição, imagem, produtos e preços por estado/ambiente

2. **Implementar view de listagem de serviços com paginação** — Adicionar seção `services-list-section` em [`index.html`](index.html) com tabela mostrando categoria/código/edição, botões de ação (Ver/Editar) e controles de paginação (itens por página: 10/25/50/100) usando padrão existente de event delegation

3. **Criar view de edição de serviço com modal de preços** — Adicionar `service-edit-section` em [`index.html`](index.html) com formulário de edição dos campos principais e botão "Editar Preços" que abre modal overlay contendo tabela estilo Excel (linhas=estados BR, colunas=HML/PRD) com células editáveis via `contenteditable`

4. **Desenvolver tabela de preços estilo Excel** — Implementar em [`index.html`](index.html) e [`styles.css`](styles.css) grid HTML/CSS com 27 linhas (estados brasileiros) e 3 colunas (Estado, HML, PRD), células editáveis com validação numérica, navegação por teclado (Tab/Enter/setas), formatação monetária BRL e visual inspirado no Microsoft Excel (bordas, cores alternadas, header fixo)

5. **Adicionar exportação JSON de serviços** — Implementar função similar ao `downloadUserJson` existente para exportar serviços selecionados ou todos os serviços da listagem atual como arquivo JSON formatado

6. **Integrar sistema de navegação e cache** — Conectar novas views ao sistema de navegação existente (`showView`), adicionar botão "Serviços" no menu principal em [`index.html`](index.html), implementar cache client-side `servicesCache` seguindo padrão do `jactoUsersCache`

### Further Considerations

1. **Biblioteca para tabela Excel vs implementação custom?** — Opção A: usar  Tabulator.js

2. **Estrutura da collection `services` no Firestore precisa definição** — a estrutura do documento da colection `services` é exemplo:
```json
{
  "categoria": "SERVIÇOS",
  "codigo": 1234865,
  "edicao": "DESBLOQUEIO DE SERVIÇOS",
  "imagem": "https://jacto.vteximg.com.br/arquivos/ids/1122493-1000-1000/OMNI700.jpg?v=638234263919100000",
  "produto": [
    {
      "descricao": " Licença de uso de software upgrade TerraStar C",
      "nomeProduto": "SOFTWARE UPGRADE TERRASTAR C",
      "preco": 11200,
      "quantidade": 1,
      "segmento": "SERVIÇOS",
      "servico": "DESBLOQUEIO",
      "subcategoria": "AGRICULTURA DIGITAL",
      "tipo": "TERRASTAR C (SM6L)",
      "versao": "Receptor GPS"
    }
  ]
}
```

3. **Validações de preço e regras de negócio** — Definir: Valor Minimo 1 BRL sem máximo, apenas números positivos

estrutura dos documentos da colections de price:
```json
{
  "code": "100008",
  "um": "PC",
  "prices": {
    "HML": {
      "AC": "290.38",
      "AL": "290.38",
      "AM": "294.16",
      "AP": "286.70",
      "BA": "290.38",
      "CE": "294.16",
      "DF": "286.70",
      "ES": "283.11",
      "GO": "283.11",
      "MA": "294.16",
      "MG": "304.89",
      "MS": "283.11",
      "MT": "283.11",
      "PA": "290.38",
      "PB": "294.16",
      "PE": "296.09",
      "PI": "298.04",
      "PR": "308.80",
      "RJ": "312.82",
      "RN": "286.70",
      "RO": "292.26",
      "RR": "294.16",
      "RS": "309.29",
      "SC": "301.07",
      "SE": "302.02",
      "SP": "300.03",
      "TO": "294.16"
    },
    "PRD": {
      "AC": "310.7",
      "AL": "310.7",
      "AM": "314.75",
      "AP": "306.77",
      "BA": "316.81",
      "CE": "314.75",
      "DF": "314.75",
      "ES": "302.93",
      "GO": "302.93",
      "MA": "323.15",
      "MG": "326.22",
      "MS": "302.93",
      "MT": "302.93",
      "PA": "310.7",
      "PB": "314.75",
      "PE": "316.81",
      "PI": "318.9",
      "PR": "332.55",
      "RJ": "343.65",
      "RN": "306.77",
      "RO": "312.71",
      "RR": "314.75",
      "RS": "330.93",
      "SC": "322.13",
      "SE": "314.75",
      "SP": "321.04",
      "TO": "314.75"
    }
  }
}
```
