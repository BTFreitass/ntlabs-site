/* Dados iniciais: usados até o painel salvar a primeira alteração. */
const GH = 'https://github.com/BTFreitass';
export const SEED_PROJETOS = [
  { id: 'p0', nome: 'Sistema para imobiliária com CCA', tipo: 'Sistema web', status: 'Em desenvolvimento', desc: 'Site de imóveis com simulação de financiamento e área do Correspondente CAIXA Aqui integrada.', tema: 'imob', cliente: 'c1' },
  { id: 'p1', nome: 'Catálogo para loja de moda íntima', tipo: 'Catálogo + WhatsApp', status: 'Em desenvolvimento', desc: 'Vitrine de produtos com tamanhos e cores; o pedido chega montado no WhatsApp da loja.', tema: 'loja', cliente: 'c2' },
  { id: 'p2', nome: 'Finance', tipo: 'Aplicação web', status: 'Entregue', desc: 'Aplicação web de organização financeira.', gh: GH + '/Finance', tema: 'fin' },
  { id: 'p3', nome: 'DEC-DOWNLOADER', tipo: 'Extensão do Chrome', status: 'Entregue', desc: 'Automatiza o download de documentos XML no portal Agência Net DF.', gh: GH + '/DEC-DOWNLOADER', tema: 'ext' },
  { id: 'p4', nome: 'FinApp2.0', tipo: 'Aplicativo Java', status: 'Entregue', desc: 'Aplicativo de controle financeiro.', gh: GH + '/FinApp2.0', tema: 'app' },
  { id: 'p5', nome: 'MeuCasamento', tipo: 'Site de evento', status: 'Entregue', desc: 'Site de casamento com as informações do evento.', gh: GH + '/MeuCasamento', tema: 'wed' },
  { id: 'p6', nome: 'Copa-Kaleo2', tipo: 'Site de campeonato', status: 'Entregue', desc: 'Site do campeonato Copa Kaleo.', gh: GH + '/Copa-Kaleo2', tema: 'cup' },
  { id: 'p7', nome: 'TopCarros', tipo: 'Site em PHP', status: 'Entregue', desc: 'Site de carros desenvolvido em PHP.', gh: GH + '/TopCarros', tema: 'car' }
].map((p, i) => ({ visivel: true, ordem: i + 1, site: '', gh: '', imgs: [], ...p }));

export const SEED_CLIENTES = [
  { id: 'c1', nome: 'Imobiliária (CCA)', negocio: '', whats: '', sistema: 'Sistema web de imobiliária com CCA integrado: o correspondente acessa direto a pasta de documentos que os corretores sobem', status: 'Em desenvolvimento', valor: '', mensal: '', inicio: '', entrega: '', link: '', painel: '', obs: 'Preencha nome, contato, valores e datas.', t: 1795756300000 },
  { id: 'c2', nome: 'Meire', negocio: 'Elegância Íntima', whats: '', sistema: 'Catálogo + WhatsApp com estoque, ou e-commerce com Mercado Pago', status: 'Proposta', valor: '', mensal: '', inicio: '', entrega: '', link: '', painel: '', obs: 'Proposta com duas formas de contratação: pagamento único ou plano mensal com tudo incluso.', t: 1795756300000 }
];
